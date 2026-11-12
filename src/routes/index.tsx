import { createFileRoute } from "@tanstack/react-router";
import { GamePage, gamePageHead } from "../components/GamePage";
export const Route = createFileRoute("/")({
  head: () => gamePageHead("en"),
  component: () => <GamePage locale="en" />,
});
