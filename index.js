const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const express = require('express');
const fs = require('fs');
const path = require('path');

// 🌐 إنشاء خادم Express لإبقاء الخدمة المجانية شغالة بدون أخطاء Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('<h1>🤖 بوت ضجة مول يعمل بنجاح!</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Web server is running on port ${PORT}`);
});

// ⚠️ مفتاح Groq الخاص بك
const groq = new Groq({ apiKey: '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' });

// 🔗 روابط القناة والكتالوج
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G"; 

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- الشعار: "ضجة في وجه الغلاء" 🔥
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- نطاق الأسعار: تبدأ من 100 ريال وتصل إلى 7,000 ريال يمني (شمالي). 💰
- رابط قناة الواتساب لمتابعة كل جديد يومياً: ${CHANNEL_URL} 📢
- الطرق المتاحة للدفع: كاش عند الاستلام، محفظة جيب (777655115)، بنك الكريمي (777655115). 💳
`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// 📸 توليد رابط مباشر لرمز QR
client.on('qr', (qr) => {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    
    console.log('\n========================================');
    console.log('📱 افتح الرابط التالي في المتصفح لمسح رمز الـ QR:');
    console.log(qrImageUrl);
    console.log('========================================\n');
});

client.on('ready', () => {
    console.log('\n✅✅ [ضجة AI] متصل ومستعد للرد على الزبائن!\n');
});

const systemPrompt = `
أنت "ضجة AI" ✨، المساعد الشخصي الذكي ومُسوق المبيعات الاحترافي لمتجر "ضجة مول للتخفيضات".
تتحدث بأسلوب بشري، مُقنع، ومختصر جداً (بلسان خدمة العملاء اليمنية المهذبة والأنبقة).

🎯 قواعد صارمة:
1. ممنوع إرسال رسائل طويلة أو متكررة نهائياً.
2. رحب بالعميل وسوّق له بأسلوب جذاب في سطرين فقط.
3. إذا طلب العميل رؤية الموديلات، وضح له أن الصور معروضة وأعطه رابط القناة: ${CHANNEL_URL}
4. إذا طلب الشراء أرسل له استمارة الطلب فوراً.

بيانات المتجر:
${dajahStoreInfo}
`;

client.on('message_create', async msg => {
    if (msg.fromMe) return;

    try {
        let userQuery = msg.body || '';

        // 🎙️ معالجة البصمات الصوتية
        if (msg.hasMedia && (msg.type === 'audio' || msg.type === 'ptt')) {
            const media = await msg.downloadMedia();
            const ext = media.mimetype.includes('ogg') ? 'ogg' : 'mp3';
            const filePath = path.join(__dirname, `temp_voice_${Date.now()}.${ext}`);
            fs.writeFileSync(filePath, media.data, { encoding: 'base64' });

            try {
                const transcription = await groq.audio.transcriptions.create({
                    file: fs.createReadStream(filePath),
                    model: 'whisper-large-v3-turbo',
                    language: 'ar',
                });
                userQuery = transcription.text;
            } catch (err) {
                console.error('خطأ الصوت:', err.message);
            } finally {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        }

        if (!userQuery || userQuery.trim() === '') return;

        console.log(`📩 الرسالة الواردة: ${userQuery}`);

        // 📝 استمارة حجز الطلب
        const isOrder = userQuery.includes('طلب') || userQuery.includes('أطلب') || userQuery.includes('أشتري') || userQuery.includes('حجز');
        if (isOrder && !userQuery.includes('استمارة')) {
            const orderForm = `📝 *استمارة حجز الطلب — ضجة مول* 🛍️✨\n\nأرسل لنا بياناتك لتأكيد الطلب فوراً:\n\n👤 *الاسم الكامل:*\n📱 *رقم التواصل:*\n📍 *العنوان بالتفصيل:*\n👗 *اسم الموديل والسعر:*\n🔢 *الكمية والمقاس:*\n💵 *شمالي أم جنوبي:*`;
            await msg.reply(orderForm);
            return;
        }

        // 💬 رد الذكاء الاصطناعي
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userQuery }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
        });

        let replyText = chatCompletion.choices[0]?.message?.content || 'أهلاً بك في ضجة مول! ✨';
        replyText = replyText.replace(/[a-zA-Z]+/g, '').trim();

        await msg.reply(replyText);

    } catch (error) {
        console.error('خطأ المعالجة:', error.message);
    }
});

console.log('جاري تشغيل النظام... انتظر قليلاً');
client.initialize();
