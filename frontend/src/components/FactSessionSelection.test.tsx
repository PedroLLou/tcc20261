import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FactSessionSelection from "./FactSessionSelection";
import factService from "../services/factService";

jest.mock("../services/factService", () => ({
  __esModule: true,
  default: {
    listAvailableForSession: jest.fn(),
    selectForSession: jest.fn(),
  },
}));

const availableFact = {
  id: 4,
  authorId: 2,
  sessionId: null,
  relatedUserId: null,
  description: "Entrega concluída",
  recordedAt: "2026-10-30T12:00:00.000Z",
  attachments: [],
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-30T12:00:00.000Z",
};

describe("FactSessionSelection", () => {
  it("consulta, seleciona e associa fatos à sessão", async () => {
    (factService.listAvailableForSession as jest.Mock).mockResolvedValue({
      items: [availableFact],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    (factService.selectForSession as jest.Mock).mockResolvedValue([
      availableFact,
    ]);

    render(<FactSessionSelection sessionId={10} />);

    expect(await screen.findByText("Entrega concluída")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /associar 1 fato/i }));

    await waitFor(() =>
      expect(factService.selectForSession).toHaveBeenCalledWith(10, [4]),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Fatos associados à sessão com sucesso.",
    );
  });

  it("exibe mensagem quando não há fatos disponíveis", async () => {
    (factService.listAvailableForSession as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    render(<FactSessionSelection sessionId={10} />);

    expect(
      await screen.findByText("Nenhum fato disponível para esta sessão."),
    ).toBeInTheDocument();
  });
});
