// state.js — central in-memory app state + tiny pub/sub, plus sessionStorage persistence
// so a refresh mid-form (or after a sandbox "payment") doesn't lose the user's work.

const STORAGE_KEY = "instant-portfolio:v1";

function emptyProject() {
  return { title: "", description: "", link: "", image: "" };
}

function defaultState() {
  return {
    route: "landing", // landing | form | preview | checkout | success
    step: 0,
    name: "",
    role: "",
    tagline: "",
    projects: [emptyProject(), emptyProject()],
    skills: [],
    contacts: [{ label: "Email", url: "" }],
    hasPaid: false,
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

let state = load();
const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  persist();
  listeners.forEach((fn) => fn(state));
}

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / privacy-mode errors — non-critical
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function resetAll() {
  state = defaultState();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(state));
}

export { emptyProject };
