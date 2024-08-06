require('dotenv').config();
import { Client, GatewayIntentBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const BEATRICE_TOKEN: string = process.env.BEATRICE_TOKEN!;
const GEMINI_TOKEN: string = process.env.GEMINI_TOKEN!;

const geminiAI = new GoogleGenerativeAI(GEMINI_TOKEN);
const geminiModel = geminiAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
});

const beatrice = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

beatrice.on('ready', () => {
    console.log(`Logged in as ${beatrice.user!.tag}`);
});

beatrice.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content
        .replace(new RegExp(`<@!?${beatrice.user!.id}>`, 'gi'), '')
        .replace(`@${beatrice.user!.username}`, '');

    if (content === '!ping') {
        return message.reply('pong');
    }

    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        const caption = message.content.trim();

        if (attachment) {
            const imageBuf = await axios.get(attachment.url, {
                responseType: 'arraybuffer',
            });
            const imageBin = Buffer.from(imageBuf.data, 'binary').toString(
                'base64',
            );

            const response = await geminiModel.generateContent([
                caption,
                {
                    inlineData: {
                        data: imageBin,
                        mimeType: 'image/png',
                    },
                },
            ]);

            return message.reply(
                response.response
                    .text()
                    .replace(/@everyone/g, '@everyone\u200B')
                    .replace(/@here/g, '@here\u200B'),
            );
        }
    } else if (message.mentions.has(beatrice.user!.id)) {
        const response = await geminiModel.generateContent(content);
        return message.reply(
            response.response
                .text()
                .replace(/@everyone/g, '@/everyone')
                .replace(/@here/g, '@/here'),
        );
    }
});

beatrice.on('messageUpdate', async (oldMessage, newMessage) => {
    if (oldMessage.author.bot) return;

    if (newMessage.partial) {
        try {
            await newMessage.fetch();
        } catch (error) {
            console.error('Error fetching the new message:', error);
            return;
        }
    }

    const attachment = newMessage.attachments.first();
    const caption = newMessage.content
        .trim()
        .replace(new RegExp(`<@!?${beatrice.user!.id}>`, 'gi'), '')
        .replace(`@${beatrice.user!.username}`, ''); // Extract the caption

    if (attachment) {
        const imageBuf = await axios.get(attachment.url, {
            responseType: 'arraybuffer',
        });
        const imageBin = Buffer.from(imageBuf.data, 'binary').toString(
            'base64',
        );
        const response = await geminiModel.generateContent([
            caption,
            {
                inlineData: {
                    data: imageBin,
                    mimeType: 'image/png',
                },
            },
        ]);

        let newContent = response.response
            .text()
            .replace(/@everyone/g, '@everyone\u200B')
            .replace(/@here/g, '@here\u200B');

        if (newContent.length > 2000) {
            newContent = newContent.substring(0, 1997) + '...';
        }

        try {
            const botReply = await newMessage.channel.messages.fetch({
                limit: 100,
            });
            const botMessage = botReply.find(
                msg =>
                    msg.reference?.messageId === oldMessage.id &&
                    msg.author.id === beatrice.user.id,
            );

            if (botMessage) {
                await botMessage.edit(newContent);
                console.log('Bot message edited successfully');
            } else {
                console.log('Bot reply not found');
            }
        } catch (error) {
            console.error('Error editing the bot message:', error);
        }
    } else {
        const response = await geminiModel.generateContent(caption);
        let newContent = response.response
            .text()
            .replace(/@everyone/g, '@everyone\u200B')
            .replace(/@here/g, '@here\u200B');

        if (newContent.length > 2000) {
            newContent = newContent.substring(0, 1997) + '...';
        }

        try {
            const botReply = await newMessage.channel.messages.fetch({
                limit: 100,
            });
            const botMessage = botReply.find(
                msg =>
                    msg.reference?.messageId === oldMessage.id &&
                    msg.author.id === beatrice.user.id,
            );

            if (botMessage) {
                await botMessage.edit(newContent);
                console.log('Bot message edited successfully');
            } else {
                console.log('Bot reply not found');
            }
        } catch (error) {
            console.error('Error editing the bot message:', error);
        }
    }
});

beatrice.login(BEATRICE_TOKEN);
