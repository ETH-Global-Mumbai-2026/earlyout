import { MODE } from "../addresses";
import type { Source } from "../types";
import { mockSource } from "./mock";
import { chainSource } from "./chain";

export const source: Source = MODE === "mock" ? mockSource : chainSource;
