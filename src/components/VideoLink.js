function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default function VideoLink({ url }) {
  if (!url) return null;
  const embed = toEmbedUrl(url);

  if (embed) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border)] aspect-video">
        <iframe
          src={embed}
          title="Vídeo"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-2 inline-block text-[12.5px] text-[var(--accent)] underline underline-offset-2"
    >
      Ver vídeo ↗
    </a>
  );
}
