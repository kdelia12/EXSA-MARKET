const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const token = process.env.TOKEN;
const channelbuy = process.env.channelbuy;
const channelsell = process.env.channelsell;
const channellastsales = process.env.channellastsales;
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    // ...
  ],
});
app.use(cors({ origin: '*' }));
app.get('/search', async (req, res) => {
  try {
    const { type, keyword } = req.query;
    if (!type) {
      return res.status(400).json({ error: 'Please provide type parameter (buying or selling)' });
    }
    if (!keyword) {
      return res.status(400).json({ error: 'Please provide keyword parameter' });
    }
    let channelId, beforeMessageId;
    if (type === 'buying') {
      channelId = channelbuy;
      beforeMessageId = null;
    } else if (type === 'selling') {
      channelId = channelsell;
      beforeMessageId = null;
    } else {
      return res.status(400).json({ error: 'Invalid type parameter (must be buying or selling)' });
    }
    const channel = await client.channels.fetch(channelId);
    if (!beforeMessageId) {
      const latestMessage = await channel.messages.fetch({ limit: 1 });
      beforeMessageId = latestMessage.first().id;
    }
    let messages = await channel.messages.fetch({ before: beforeMessageId });
    const messagesWithKeyword = messages.filter((message) => {
      const content = message.content.toLowerCase();
      const keywordLower = keyword.toLowerCase();
      if (content.includes(keywordLower)) {
        return true;
      }
      if (message.embeds.length > 0) {
        const embed = message.embeds[0];
        if (embed.description && embed.description.toLowerCase().includes(keywordLower)) {
          return true;
        }
        if (embed.title && embed.title.toLowerCase().includes(keywordLower)) {
          return true;
        }
        if (embed.author && embed.author.name && embed.author.name.toLowerCase().includes(keywordLower)) {
          return true;
        }
        if (embed.fields.length > 0) {
          const fieldsWithKeyword = embed.fields.filter(
            (field) =>
              field.name.toLowerCase().includes(keywordLower) ||
              field.value.toLowerCase().includes(keywordLower)
          );
          if (fieldsWithKeyword.length > 0) {
            return true;
          }
        }
      }
      return false;
    });
    const results = messagesWithKeyword.map((message) => {
        const embed = message.embeds[0];
        const fields = embed.description.split('\n').map((line) => line.trim());
        const itemField = fields.find((field) => field.startsWith('**Item:'));
        const item = itemField ? itemField.slice('Item: ** *'.length).trim() : null;
        const priceField = fields.find((field) => field.startsWith('**Price: '));
        const price = priceField ? priceField.slice('Price: ** *'.length).trim() : null;
        const paymentField = fields.find((field) => field.startsWith('**Payment: '));
        const payment = paymentField ? paymentField.slice('Payment: ** *'.length).trim() : null;
        const specificField = fields.find((field) => field.startsWith('**Specific: '));
        const specific = specificField ? specificField.slice('Specific: ** *'.length).trim() : null;
        const typeField = fields.find((field) => field.startsWith('**Type: '));
        const type = typeField ? typeField.slice('Type: ** **'.length).trim() : null;
        const quantityField = fields.find((field) => field.startsWith('**Quantity: '));
        const quantity = quantityField ? quantityField.slice('Quantity: ** *'.length).trim() : null;
        const collateralField = fields.find((field) => field.startsWith('**Collateral: '));
        const collateral = collateralField ? collateralField.slice('Collateral: ** *'.length).trim() : 'NO';
      
        return {
          item,
          price,
          payment,
          specific,
          type,
          quantity,
          collateral,
        link: `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`,
      };
    });
    return res.json({ results });
  } catch (err) {
    console.error(`Error: ${err}`);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/lastsales', async (req, res) => {
  let counter=0;
  try {
    const channelId = channellastsales; // Replace with the ID of your channel
    let beforeMessageId = null;
    const channel = await client.channels.fetch(channelId);
    if (!beforeMessageId) {
      const latestMessage = await channel.messages.fetch({ limit: 10});
      beforeMessageId = latestMessage.first().id;
    }
    let messages = await channel.messages.fetch({ before: beforeMessageId });
    const messageArray = Array.from(messages.values());
    const results = messageArray.slice(0, 12).map((message) => {
      let price = "";
      let specific = "";
      let quantity = "";
      let messageLink = "";
      let embed = ""
      
      embed = message.embeds[0];
      console.log(embed);
      const item = embed.data.title.split(',')[0].replace(/<.*>/g, '').trim();
      let items = item;
      counter = counter+1;
      console.log(items);
       price = embed.fields[0].value;
      console.log(price);
      console.log(counter);
       specific = embed.fields[1].value;
       quantity = embed.fields[2].value;
       messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
        return {
          item,
          price,
          specific,
          quantity,
          messageLink,
      };
    });
    return res.json({ results });
  } catch (err) {
    console.error(`Error: ${err}`);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});


client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  app.listen(8080, () => {
    console.log('API server listening on port 8080');
  });
});

client.login(token);