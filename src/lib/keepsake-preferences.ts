export function keepsakePreferences(id: string) {
  const empty = {
    title: "",
    words: "",
    captions: {} as Record<string, string>,
  };
  try {
    const value = JSON.parse(
      localStorage.getItem(`1in8bn-room-${id}`) || "null",
    );
    if (!value || typeof value !== "object") return empty;
    const captions: Record<string, string> = {};
    if (value.captions && typeof value.captions === "object")
      for (const [key, text] of Object.entries(value.captions).slice(0, 1500))
        if (typeof text === "string") captions[key] = text.slice(0, 240);
    return {
      title: typeof value.title === "string" ? value.title.slice(0, 80) : "",
      words: typeof value.words === "string" ? value.words.slice(0, 400) : "",
      captions,
    };
  } catch {
    return empty;
  }
}
