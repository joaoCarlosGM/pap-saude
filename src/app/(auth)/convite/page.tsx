import InvitationActivation from "@/components/auth/InvitationActivation"

export default async function InvitationPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      token?: string
    }>
}) {
  const {
    token = "",
  } =
    await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <InvitationActivation
          token={
            token
          }
        />
      </div>
    </main>
  )
}
