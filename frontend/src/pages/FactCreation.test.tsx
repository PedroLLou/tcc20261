import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FactCreation from "./FactCreation";
import factService from "../services/factService";
import userService from "../services/userService";

jest.mock("../services/factService");
jest.mock("../services/userService");

describe("FactCreation", () => {
  const createMock = factService.create as jest.Mock;
  const listAvailableMock = userService.listAvailableForFacts as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    listAvailableMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: 1 });
  });

  it("limpa o input e permite enviar o mesmo arquivo em dois fatos", async () => {
    render(<FactCreation onSaved={jest.fn()} />);
    const file = new File(["evidência"], "evidencia.pdf", {
      type: "application/pdf",
    });
    const input = screen.getByLabelText(
      "Anexos (opcionais)",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Descrição do fato"), {
      target: { value: "Primeiro fato" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar registro" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(input.value).toBe("");

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Descrição do fato"), {
      target: { value: "Segundo fato" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar registro" }));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(2));
    expect(createMock).toHaveBeenNthCalledWith(1, "Primeiro fato", null, [
      file,
    ]);
    expect(createMock).toHaveBeenNthCalledWith(2, "Segundo fato", null, [file]);
  });

  it("recusa uma imagem BMP antes do envio", () => {
    render(<FactCreation onSaved={jest.fn()} />);
    const file = new File(["bitmap"], "imagem.bmp", { type: "image/bmp" });
    const input = screen.getByLabelText(
      "Anexos (opcionais)",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(
      screen.getByText(/O formato do arquivo "imagem\.bmp" não é permitido/),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("aceita uma imagem PNG", async () => {
    render(<FactCreation onSaved={jest.fn()} />);
    const file = new File(["png"], "imagem.png", { type: "image/png" });
    const input = screen.getByLabelText(
      "Anexos (opcionais)",
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("Descrição do fato"), {
      target: { value: "Fato com imagem" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar registro" }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith("Fato com imagem", null, [file]),
    );
  });

  it("bloqueia o envio quando a seleção contém um anexo inválido", () => {
    render(<FactCreation onSaved={jest.fn()} />);
    const validFile = new File(["pdf"], "evidencia.pdf", {
      type: "application/pdf",
    });
    const oversizedFile = new File(["video"], "video.mp4", {
      type: "video/mp4",
    });
    Object.defineProperty(oversizedFile, "size", {
      value: 50 * 1024 * 1024 + 1,
    });
    const input = screen.getByLabelText(
      "Anexos (opcionais)",
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [validFile, oversizedFile] },
    });
    fireEvent.change(screen.getByLabelText("Descrição do fato"), {
      target: { value: "Fato sem envio parcial" },
    });

    expect(
      screen.getByText(/Cada anexo deve ter no máximo 50 MB/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar registro" }),
    ).toBeDisabled();
    expect(createMock).not.toHaveBeenCalled();
  });
});
