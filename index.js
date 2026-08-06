const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('<h1>🤖 بوت ضجة مول يعمل بأقل استهلاك ذاكرة!</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

const groq = new Groq({ apiKey: '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' });
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G";

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- الأسعار: 100 - 7,000 ريال يمني (شمالي). 💰
- القناة: ${CHANNEL_URL} 📢
`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // لتخفيف الذاكرة
            '--disable-gpu',
            '--js-flags="--max-old-space-size=256"' // تقييد الذاكرة المستهلكة
        ]
    }
});

client.on('qr', (qr) => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('\n========================================');
    console.log('📱 QR URL:', qrImageUrl);
    console.log('========================================\n');
});

client.on('ready', () => {
    console.log('\n✅✅ [ضجة AI] متصل ومستعد للرد!\n');
});

const systemPrompt = `أنت "ضجة AI" المساعد لمتجر "ضجة مول للتخفيضات". جاوب باختصار وبلهجة يمنية مهذبة. بيانات: ${dajahStoreInfo}`;

client.on('message_create', async msg => {
    if (msg.fromMe) return;

    try {
        let userQuery = msg.body || '';

        // معالجة البصمات الصوتية
        if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt')) {
            const media = await msg.downloadMedia();
            const ext = media.mimetype.includes('ogg') ? 'ogg' : 'mp3';
            const filePath = path.join(__dirname, `temp_${Date.now()}.${ext}`);
            fs.writeFileSync(filePath, media.data, { encoding: 'base64' });

            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: 'whisper-large-v3-turbo',
                    language: 'ar',
                });
                userQuery = transcription.text;
            } catch (err) {
                console.error('Audio Err:', err.message);
            } finally {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }

        if (!userQuery.trim()) return;

        console.log(`📩 الرسالة: ${userQuery}`);

        if ((userQuery.includes('طلب') || userQuery.includes('أشتري')) && !userQuery.includes('استمارة')) {
            await msg.reply(`📝 *استمارة حجز الطلب — ضجة مول* 🛍️\n\n👤 *الاسم:*\n📱 *رقم التواصل:*\n📍 *العنوان:*\n👗 *اسم الموديل والسعر:*`);
            return;
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userQuery }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
        });

        let replyText = chatCompletion.choices[0]?.message?.content || 'أهلاً بك في ضجة مول!';
        await msg.reply(replyText.trim());

    } catch (error) {
        console.error('Err:', error.message);
    }
});

client.initialize();
