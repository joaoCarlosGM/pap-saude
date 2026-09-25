"use client"

import {
  Search,
  Upload,
} from "lucide-react"

import {
  useMemo,
  useState,
} from "react"

import AddProtocolModal from "./AddProtocolModal"
import ProtocolCard from "./ProtocolCard"
import ProtocolPreviewModal from "./ProtocolPreviewModal"

import { Button } from "@/components/ui/button"

import type { Protocol } from "@/types/protocolo"

type ProtocolListProps = {
  protocols: Protocol[]
}

export default function ProtocolList({
  protocols,
}: ProtocolListProps) {
  const [search, setSearch] =
    useState("")

  const [addModalOpen, setAddModalOpen] =
    useState(false)

  const [
    selectedProtocol,
    setSelectedProtocol,
  ] = useState<Protocol | null>(null)

  const filteredProtocols =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase()

      if (!query) {
        return protocols
      }

      return protocols.filter(
        (protocol) =>
          protocol.title
            .toLowerCase()
            .includes(query) ||
          protocol.description
            .toLowerCase()
            .includes(query),
      )
    }, [protocols, search])

  return (
    <>
      <div>
        {/* BUSCA + BOTÃO */}
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-start
            sm:justify-between
          "
        >
          <div className="relative w-full sm:max-w-[400px]">
            <Search
              size={17}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Buscar protocolo..."
              className="
                h-11
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                pl-10
                pr-3
                text-sm
                text-slate-700
                shadow-sm
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-pink-400
                focus:ring-2
                focus:ring-pink-100
              "
            />
          </div>

          <Button
            type="button"
            onClick={() =>
              setAddModalOpen(true)
            }
            className="
              h-11
              w-full
              shrink-0
              px-5
              sm:w-auto
            "
          >
            <Upload size={16} />

            Adicionar Protocolo
          </Button>
        </div>

        {/* CARDS */}
        {filteredProtocols.length >
        0 ? (
          <div
            className="
              mt-6
              grid
              grid-cols-1
              gap-4
              md:grid-cols-2
              2xl:grid-cols-3
            "
          >
            {filteredProtocols.map(
              (protocol) => (
                <ProtocolCard
                  key={protocol.id}
                  protocol={protocol}
                  onPreview={
                    setSelectedProtocol
                  }
                />
              ),
            )}
          </div>
        ) : (
          <div
            className="
              mt-6
              flex
              min-h-64
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-slate-200
              bg-white
              p-6
              text-center
            "
          >
            <div>
              <Search
                size={28}
                className="mx-auto text-slate-300"
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-medium
                  text-slate-600
                "
              >
                Nenhum protocolo
                encontrado
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                Tente pesquisar usando
                outro termo.
              </p>
            </div>
          </div>
        )}
      </div>

      <AddProtocolModal
        open={addModalOpen}
        onClose={() =>
          setAddModalOpen(false)
        }
      />

      <ProtocolPreviewModal
        protocol={selectedProtocol}
        open={
          selectedProtocol !== null
        }
        onClose={() =>
          setSelectedProtocol(null)
        }
      />
    </>
  )
}