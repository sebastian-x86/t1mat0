export default {
    extends: ["@commitlint/config-conventional"],

    // Dependabot verlinkt Changelogs und Vergleiche im Body. Die URLs lassen
    // sich nicht auf 100 Zeichen umbrechen, deshalb gilt die Regel nur für
    // handgeschriebene Nachrichten.
    ignores: [(message) => /^Signed-off-by: dependabot\[bot\]/m.test(message)],
};
