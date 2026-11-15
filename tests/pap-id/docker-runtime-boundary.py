"""Package the tested standalone with the pinned runtime base; not a canonical multistage/CI rebuild.
Uses only task-owned temporary containers/image, no database, pull, publication or deployment.
"""
import hashlib, http.client, io, json, os, pathlib, secrets, shutil, subprocess, tarfile, tempfile, time
ROOT = pathlib.Path.cwd()
OUT = ROOT / '.local/final-local'
BASE = 'node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402'
label = secrets.token_hex(12)
name = 'pap-beta1-final-' + label
image = name + ':runtime-artifact'
work = pathlib.Path(tempfile.mkdtemp(prefix='pap-beta1-runtime-'))
log = (OUT / 'docker-runtime-private.log').open('w')
containers = []
image_created = False

def docker(*args, output=False):
    return subprocess.check_output(['docker', *args], text=True).strip() if output else subprocess.run(['docker', *args], check=True, stdout=log, stderr=log)

def remove_container(container):
    info = json.loads(docker('inspect', container, output=True))[0]
    assert info['Config']['Labels'].get('pap.beta1.final.owner') == label
    docker('rm', '-f', container)  # Only the exact container just created and ownership checked.
    containers.remove(container)

try:
    app = work / 'app'
    for p in (ROOT / '.next/standalone').rglob('*'):
        if p.is_symlink():
            assert p.resolve().is_relative_to((ROOT / '.next/standalone').resolve()), 'external standalone link'
    shutil.copytree(ROOT / '.next/standalone', app, symlinks=True)
    shutil.copytree(ROOT / '.next/static', app / '.next/static')
    shutil.copytree(ROOT / 'public', app / 'public', dirs_exist_ok=True)
    docker('image', 'inspect', BASE)
    base_container = name + '-base'
    docker('create', '--name', base_container, '--label', 'pap.beta1.final.owner=' + label, BASE, 'true')
    containers.append(base_container)
    docker('export', '-o', str(work / 'base.tar'), base_container)
    remove_container(base_container)
    # Flatten the same runtime roots, strip package managers, append the same nonroot identity.
    with tarfile.open(work / 'base.tar') as source, tarfile.open(work / 'runtime.tar', 'w') as target:
        for m in source:
            n = m.name.lstrip('./')
            denied = ['app', 'usr/local/lib/node_modules/npm', 'usr/local/lib/node_modules/corepack', 'opt/yarn']
            if any(n == p or n.startswith(p + '/') or (p == 'opt/yarn' and n.startswith(p)) for p in denied):
                continue
            if n in ['usr/local/bin/' + p for p in ['npm','npx','corepack','yarn','yarnpkg','pnpm','pnpx']]:
                continue
            data = source.extractfile(m) if m.isfile() else None
            if n in ['etc/passwd', 'etc/group']:
                old = data.read()
                extra = b'nextjs:x:1001:1001::/home/nextjs:/sbin/nologin\n' if n == 'etc/passwd' else b'nodejs:x:1001:\n'
                data = io.BytesIO(old + extra)
                m.size = len(old + extra)
            target.addfile(m, data)
        def nonroot(m):
            m.uid = m.gid = 1001
            m.uname = 'nextjs'
            m.gname = 'nodejs'
            return m
        target.add(app, arcname='app', filter=nonroot)
    size = (work / 'runtime.tar').stat().st_size
    assert shutil.disk_usage('/').free > size * 2 + 100 * 1024**2, 'root disk budget insufficient'
    args = ['import']
    for change in ['WORKDIR /app','USER 1001:1001','ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0','CMD ["node", "server.js"]','LABEL pap.beta1.final.owner=' + label]:
        args += ['--change', change]
    docker(*args, str(work / 'runtime.tar'), image)
    image_created = True
    image_id = docker('image', 'inspect', '--format', '{{.Id}}', image, output=True)
    proxy = secrets.token_hex(32)
    env = work / 'runtime.env'
    env.write_text('DATABASE_URL=postgresql://no_connection:unused@127.0.0.1:1/no_operational_database\nPAP_ADMIN_BETA_ONLY=1\nPAP_BETA_COMMERCIAL_ENABLED=1\nPAP_ADMIN_BETA_PROXY_TOKEN=' + proxy + '\nPAP_PRIVATE_REVIEW=1\nPAP_EMAIL_PROVIDER=disabled\nPAP_EMAIL_EXTERNAL_ENABLED=0\n')
    env.chmod(0o600)
    container = name + '-web'
    docker('run','-d','--name',container,'--label','pap.beta1.final.owner='+label,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,noexec,nosuid,size=64m','--env-file',str(env),'-p','127.0.0.1::3000',image)
    containers.append(container)
    info = json.loads(docker('inspect',container,output=True))[0]
    published = info['NetworkSettings']['Ports']['3000/tcp']
    assert len(published) == 1 and published[0]['HostIp'] == '127.0.0.1'
    port = int(published[0]['HostPort'])
    def request(route, rsc=False):
        conn = http.client.HTTPConnection('127.0.0.1',port,timeout=4)
        try:
            conn.request('GET',route,headers={'x-pap-beta-proxy-token':proxy,**({'RSC':'1'} if rsc else {})})
            response = conn.getresponse()
            status,location = response.status,response.getheader('location')
            response.read()
            return status,location
        finally:
            conn.close()
    for i in range(100):
        try:
            if request('/homologacao/sessao')[0] == 404:
                break
        except (OSError,http.client.HTTPException):
            pass
        time.sleep(.2)
    else:
        raise AssertionError('owned runtime did not become healthy')
    routes=['/homologacao/sessao','/homologacao/carteirinhas','/homologacao/documentos/sepse-obstetrica?download=1','/homologacao/pacientes/maria-gracas/documentos','/homologacao/pacientes/maria-gracas/carteirinhas/00000000-0000-4000-8000-000000000000','/api/clinical/patients']
    for route in routes:
        assert request(route)[0] == 404 and request(route,True)[0] == 404
    status,location=request('/vitrine/protocolos')
    assert status in [302,303,307,308] and '/login' in location
    docker('export','-o',str(work / 'candidate.tar'),container)
    profile_file=os.environ.get('PAP_ID_REVIEW_PROFILE')
    profile=json.loads(pathlib.Path(profile_file).read_text()) if profile_file else {}
    needles=[profile[k].encode() for k in ['password','cardKey','owner'] if k in profile]
    count=0
    with tarfile.open(work / 'candidate.tar') as archive:
        for m in archive:
            n=m.name.lstrip('./')
            if n.startswith('app/'):
                parts=pathlib.PurePosixPath(n).parts
                assert '.local' not in parts and 'scripts/private-review' not in n and '/tests/pap-id' not in n
                assert parts[-1] not in ['profile.json','key.pem','rootCA-key.pem','base-sintetica.json','sindromes-hipertensivas-gestacao.pdf','hemorragia-pos-parto.pdf','sepse-obstetrica.pdf']
                assert not parts[-1].startswith('carteirinha-')
            if m.isfile():
                f=archive.extractfile(m)
                tail=b''
                while True:
                    b=f.read(1024*1024)
                    if not b: break
                    block=tail+b
                    assert not any(s in block for s in needles), 'private material in runtime'
                    tail=block[-128:]
                count+=1
    result={'status':'PASS','localImageId':image_id,'runtimeFromTestedStandalone':True,'basePinned':True,'nonroot':True,'readOnlyContainer':True,'privateArtifactsAbsent':True,'privateSecretsAbsent':True,'filesInspected':count,'httpAndRscPrivate404':True,'unauthenticatedRedirectsToLogin':True,'databaseUsed':False,'imagePublished':False,'canonicalMultistageBuild':False}
    (OUT / 'docker-runtime.json').write_text(json.dumps(result,indent=2))
    print(json.dumps(result))
finally:
    for c in containers[:]:
        try: remove_container(c)
        except Exception: pass
    if image_created:
        try: docker('image','rm',image)
        except Exception: pass
    log.close()
