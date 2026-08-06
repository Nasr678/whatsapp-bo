import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import Groq from 'groq-sdk';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('<h1>🤖 بوت ضجة مول يعمل بنجاح وبدون استهلاك ذاكرة!</h1>'));
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Server running on port ${PORT}`));

const groq = new Groq({ apiKey: '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' });
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G";

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- الأسعار: 100 - 7,000 ريال يمني (شمالي). 💰
- القناة: ${CHANNEL_URL} 📢
`;

const systemPrompt = `أنت "ضجة AI" المساعد لمتجر "ضجة مول للتخفيضات". جاوب باختصار وبلهجة يمنية مهذبة. بيانات المتجر: ${dajahStoreInfo}`;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket.default({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('\n========================================');
            console.log('📱 افتح الرابط التالي لمسح الـ QR فوراً:');
            console.log(qrImageUrl);
            console.log('========================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ انقطع الاتصال، جاري إعادة الاتصال...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('\n✅✅ [ضجة AI] متصل بنجاح 100% ومستعد للرد على الزبائن!\n');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!textMessage.trim()) return;

        console.log(`📩 رسالة من (${from}): ${textMessage}`);

        try {
            if ((textMessage.includes('طلب') || textMessage.includes('أشتري') || textMessage.includes('حجز')) && !textMessage.includes('استمارة')) {
                const orderForm = `📝 *استمارة حجز الطلب — ضجة مول* 🛍️✨\n\nأرسل لنا بياناتك لتأكيد الطلب فوراً:\n\n👤 *الاسم الكامل:*\n📱 *رقم التواصل:*\n📍 *العنوان بالتفصيل:*\n👗 *اسم الموديل والسعر:*`;
                await sock.sendMessage(from, { text: orderForm });
                return;
            }

            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: textMessage }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.3,
            });

            let replyText = chatCompletion.choices[0]?.message?.content || 'أهلاً بك في ضجة مول! ✨';
            await sock.sendMessage(from, { text: replyText.trim() });

        } catch (error) {
            console.error('❌ خطأ المعالجة:', error.message);
        }
    });
}

startBot();
