import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToteBoard } from "./ToteBoard";

describe("ToteBoard", () => {
  it("renders implied percentages derived from the pools", () => {
    // 800 XLM YES vs 200 XLM NO -> 80% / 20%
    render(<ToteBoard poolYes={8_000_000_000n} poolNo={2_000_000_000n} />);
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("marks the winning side once resolved", () => {
    render(
      <ToteBoard
        poolYes={5_000_000_000n}
        poolNo={5_000_000_000n}
        outcome={true}
      />,
    );
    expect(screen.getByText("WON")).toBeInTheDocument();
  });
});
