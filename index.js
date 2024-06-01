import pkg from 'discord.js';
const { Client, GatewayIntentBits, EmbedBuilder } = pkg;

// Initialize Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Type mappings
const typeMapping = {
  38: "Break comets",
  29: "Jungle Obby",
  46: "Advanced Fishing",
  36: "Sled Race",
  22: "Classic Obby",
  35: "Use Fruits",
  25: "Basic Digsite Chests",
  24: "Atlantis Minigame",
  74: "Consume XP Potions",
  26: "Basic Fishing Minigame",
  23: "Complete the minefield",
  28: "Complete the Pyramid Obby",
  40: "Make gold pets",
  45: "Chests in advanced Digging Site",
  27: "Ice obby",
  20: "Hatch best eggs",
  44: "Break lucky blocks in best area",
  9: "Break diamond breakables",
  37: "Break coin jars in best area",
  42: 'Hatch rare "??" pets',
  39: "Break mini-chests in best area",
  21: "Break breakables in best area",
  4: "Earn Diamonds",
  7: "Earn Diamonds",
  3: "Use Tier IV Potions",
  41: "Make rainbow pets from best egg",
  43: "Break pinatas in best area",
  13: "Upgrade to Tier III Enchants",
  12: "Upgrade to Tier III Potions",
  34: "Use Tier IV Potions",
  73: "Break breakables in the Treasure Hideout",
};

// Function to display a progress bar with emojis
function displayProgressBar(current, total) {
  const percentComplete = Math.round((current / total) * 100);
  const barLength = 10; // Total length of the progress bar in emojis
  const barFilled = Math.round((percentComplete / 100) * barLength);

  let progressBar = "";
  for (let i = 0; i < barLength; i++) {
    if (i < barFilled) {
      if (percentComplete < 50) {
        progressBar += "🟥"; // Red for less than 50%
      } else if (percentComplete < 75) {
        progressBar += "🟨"; // Yellow for 50% to 74%
      } else {
        progressBar += "🟩"; // Green for 75% and above
      }
    } else {
      progressBar += "⬛"; // Empty part of the bar
    }
  }
  return progressBar + ` (${percentComplete}%)`;
}

// Function to fetch and update data with retry and timeout logic
async function fetchAndUpdateData(channel, clanName, infoMessageId, retryCount = 10) {
  const apiUrl = `https://biggamesapi.io/api/clan/${clanName}`;

  const fetchWithTimeout = (url, timeout = 30000) => {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  };

  try {
    const response = await fetchWithTimeout(apiUrl);
    const data = await response.json();

    // Check if the expected data is present
    if (
      !data ||
      !data.data ||
      !data.data.Battles ||
      !data.data.Battles.GoalBattleTwo ||
      !data.data.Battles.GoalBattleTwo.Goals
    ) {
      throw new Error("No 'Goals' found in the response.");
    }

    // Create an embed for a rich message format
    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`Data for clan: ${clanName}`)
      .setDescription("Current Clan Quests")
      .setTimestamp();

    for (const goal of data.data.Battles.GoalBattleTwo.Goals) {
      const goalDescription = typeMapping[goal.Type] || `Type ${goal.Type}`;
      const progressBar = displayProgressBar(goal.Progress, goal.Amount);
      const userCount = Object.keys(goal.Contributions || {}).length;
      const fieldTitle = `**${goalDescription}** - ${goal.Stars} ⭐`;
      const fieldValue = `Progress: ${progressBar} | *${goal.Progress}/${goal.Amount}* | 🧑‍🤝‍🧑 Users: ${userCount}`;

      embed.addFields({ name: fieldTitle, value: fieldValue, inline: false });
    }

    if (infoMessageId) {
      const infoMessage = await channel.messages.fetch(infoMessageId);
      await infoMessage.edit({ embeds: [embed] });
    } else {
      const sentMessage = await channel.send({ embeds: [embed] });
      return sentMessage.id;
    }
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying... Attempts left: ${retryCount - 1}`);
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait for 1 minute before retrying
      return fetchAndUpdateData(channel, clanName, infoMessageId, retryCount - 1);
    } else {
      console.error("Error fetching data:", error);
      await channel.send("Failed to fetch data after multiple attempts.");
    }
  }
}

// Object to track active monitors
const activeMonitors = {};

// Function to start a new monitor
async function startMonitor(channel, clanName) {
  if (Object.keys(activeMonitors).length >= 3) {
    channel.send(
      "Maximum number of active monitors reached. Please stop an existing monitor to start a new one.",
    );
    return;
  }

  if (activeMonitors[clanName]) {
    channel.send(`Already monitoring clan: ${clanName}`);
    return;
  }

  let infoMessageId = await fetchAndUpdateData(channel, clanName, null);
  const interval = setInterval(async () => {
    await fetchAndUpdateData(channel, clanName, infoMessageId);
  }, 20000);

  // Store the interval ID in the activeMonitors object
  activeMonitors[clanName] = interval;
}

// Function to stop a monitor
function stopMonitor(channel, clanName) {
  if (activeMonitors[clanName]) {
    clearInterval(activeMonitors[clanName]);
    delete activeMonitors[clanName];
    channel.send(`Stopped monitoring clan: ${clanName}`);
  } else {
    channel.send(`Not currently monitoring clan: ${clanName}`);
  }
}

// Event listener for when the bot is ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Event listener for new messages
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args.shift().toLowerCase();

  if (command === "!monitorclan") {
    if (args.length < 1) {
      return message.reply("Please provide a clan name.");
    }
    const clanName = args[0];
    startMonitor(message.channel, clanName);
  } else if (command === "!stopclan") {
    if (args.length < 1) {
      return message.reply("Please provide a clan name.");
    }
    const clanName = args[0];
    stopMonitor(message.channel, clanName);
  }
});

// Login the bot using your token
client.login('TOKENHERE'); // Replace with your actual token
