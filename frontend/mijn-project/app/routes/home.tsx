import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({ title, description }: Route["MetaArgs"]) {
  return [
    { title: title || "New React Router App" },
    { name: "description", content: description || "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
