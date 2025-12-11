// routes/randomHighlightRoutes.js
const express = require("express");
const router = express.Router();

const GUARDIANS_ID = 114;

function formatDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isGuardiansClip(clip) {
  const teamMatch =
    clip?.team?.id === GUARDIANS_ID ||
    clip?.editorial?.team?.id === GUARDIANS_ID;

  const text = (
    (clip.title || "") +
    " " +
    (clip.headline || "") +
    " " +
    (clip.blurb || "") +
    " " +
    (clip.description || "")
  ).toLowerCase();

  const guardiansKeywords = [
    "guardians",
    "cleveland",
    "cle",
    "ramirez",
    "naylor",
    "kwan",
    "gimenez",
    "clase",
    "bibee"
  ];

  const kwMatch = guardiansKeywords.some((kw) =>
    text.includes(kw.toLowerCase())
  );

  return teamMatch || kwMatch;
}

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    const lastYear = new Date();
    lastYear.setFullYear(today.getFullYear() - 1);

    const startDate = formatDate(lastYear);
    const endDate = formatDate(today);

    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${GUARDIANS_ID}&startDate=${startDate}&endDate=${endDate}`;
    const scheduleRes = await fetch(scheduleUrl);
    if (!scheduleRes.ok) {
      throw new Error(`Schedule error: ${scheduleRes.status}`);
    }
    const scheduleData = await scheduleRes.json();

    const games =
      scheduleData.dates?.flatMap((d) => d.games || []) || [];

    const finishedGames = games.filter(
      (g) => g.status?.abstractGameCode === "F"
    );

    if (!finishedGames.length) {
      return res.status(404).json({ error: "No games found" });
    }

    const randomGame =
      finishedGames[Math.floor(Math.random() * finishedGames.length)];
    const gamePk = randomGame.gamePk;

    const contentUrl = `https://statsapi.mlb.com/api/v1/game/${gamePk}/content`;
    const contentRes = await fetch(contentUrl);
    if (!contentRes.ok) {
      throw new Error(`Content error: ${contentRes.status}`);
    }
    const content = await contentRes.json();

    const clipItems =
      content?.highlights?.highlights?.items ||
      content?.highlights?.gameCenter?.items ||
      [];

    if (!clipItems.length) {
      return res.status(404).json({ error: "No highlights for this game" });
    }

    const guardiansClips = clipItems.filter(isGuardiansClip);

    const candidateClips =
      guardiansClips.length > 0 ? guardiansClips : clipItems;

    if (!candidateClips.length) {
      return res.status(404).json({ error: "No usable clips found" });
    }

    const randomClip =
      candidateClips[Math.floor(Math.random() * candidateClips.length)];

    const playbacks = randomClip.playbacks || [];

    const preferred =
      playbacks.find((p) => p.name?.includes("720")) ||
      playbacks.find((p) => p.name?.toLowerCase().includes("mp4")) ||
      playbacks[0];

    if (!preferred?.url) {
      return res.status(404).json({ error: "No valid video URL" });
    }

    return res.status(200).json({
      gamePk,
      title: randomClip.title || randomClip.headline,
      description: randomClip.blurb || randomClip.description,
      videoUrl: preferred.url,
    });
  } catch (err) {
    console.error("Random highlight error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
