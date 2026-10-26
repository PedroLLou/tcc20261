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
});
