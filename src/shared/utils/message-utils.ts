export const LoadingMessages = [
    "🎫 printing your ticket...",
    "🛡️ summoning the support team...",
    "📂 opening the secret files...",
    "🚀 preparing the launchpad...",
    "✨ casting a summoning spell...",
    "📡 contacting the mothership...",
    "🐢 racing the turtles...",
    "🔍 scanning the matrix...",
    "☕ sipping coffee while loading...",
    "👾 negotiating with the server goblins..."
];

export const SuccessMessages = [
    "✅ ticket created! teleport here: {channel}",
    "✨ magic! your ticket is ready at {channel}",
    "🚀 blast off! head over to {channel}",
    "🛡️ shield up! support is waiting in {channel}",
    "🎉 party time! join the ticket in {channel}"
];

export const ErrorMessages = [
    "❌ hups! bir şeyler ters gitti, ama endişelenme, senin suçun değil.",
    "⚠️ server goblins are acting up. please try again.",
    "🚫 computer says no... for now. retrying might help!",
    "💥 a wild error appeared! it was super effective."
];

export function getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
}

export function formatSuccessMessage(channelId: string): string {
    const msg = getRandomMessage(SuccessMessages);
    return msg.replace('{channel}', `<#${channelId}>`);
}
