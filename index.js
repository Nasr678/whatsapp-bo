const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// ⚠️ مفتاح Groq الخاص بك
const groq = new Groq({ apiKey: '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' });

// 🔗 روابط القناة والكتالوج
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G"; 
const CATALOG_URL = "https://wa.me/c/YOUR_NUMBER_HERE"; 

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- الشعار: "ضجة في وجه الغلاء" 🔥
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- نطاق الأسعار: تبدأ من 100 ريال وتصل إلى 7,000 ريال يمني (شمالي). 💰
- رابط قناة الواتساب لمتابعة كل جديد يومياً: ${CHANNEL_URL} 📢
- الطرق المتاحة للدفع: كاش عند الاستلام، محفظة جيب (777655115)، بنك الكريمي (777655115). 💳
`;

// ⚙️ إعدادات العميل المتوافقة مع Render
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

// 📲 استخراج وتنسيق رمز الربط بـ 8 أرقام مفصولة بشرطة تلقائياً
let pairCodeRequested = false;
client.on('qr', async () => {
    if (pairCodeRequested) return;
    pairCodeRequested = true;

    try {
        // انتظر ثانية واحدة لضمان جاهزية السيرفر لطلب الكود
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const rawCode = await client.requestPairingCode("967783103638");
        
        // إزالة أي رموز غريبة وتأكيد التنسيق 4-4
        const cleanCode = String(rawCode).replace(/[^a-zA-Z0-9]/g, '');
        const formattedCode = cleanCode.length >= 8 
            ? `${cleanCode.slice(0, 4)}-${cleanCode.slice(4, 8)}`
            : cleanCode;

        console.log('\n==================================');
        console.log(`🔑 رمز ربط الواتساب الخاص بك هو: ${formattedCode}`);
        console.log('==================================\n');
    } catch (err) {
        console.error('خطأ في استخراج رمز الربط:', err.message);
        pairCodeRequested = false;
    }
});

client.on('ready', () => {
    console.log('\n✅✅ [ضجة AI] متصل ومستعد للرد على الزبائن!\n');
});

// 🧠 شخصية الذكاء الاصطناعي
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

        // 📝 1️⃣ استمارة حجز الطلب
        const isOrder = userQuery.includes('طلب') || userQuery.includes('أطلب') || userQuery.includes('أشتري') || userQuery.includes('حجز');
        if (isOrder && !userQuery.includes('استمارة')) {
            const orderForm = `📝 *استمارة حجز الطلب — ضجة مول* 🛍️✨\n\nأرسل لنا بياناتك لتأكيد الطلب فوراً:\n\n👤 *الاسم الكامل:*\n📱 *رقم التواصل:*\n📍 *العنوان بالتفصيل:*\n👗 *اسم الموديل والسعر:*\n🔢 *الكمية والمقاس:*\n💵 *شمالي أم جنوبي:*`;
            await msg.reply(orderForm);
            return;
        }

        // 💬 2️⃣ رد الذكاء الاصطناعي
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
