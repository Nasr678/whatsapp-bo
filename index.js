const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// ⚠️ ضع مفتاح Groq الخاص بك هنا
const groq = new Groq({ apiKey: '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' });

// 🔗 روابط القناة والكتالوج
const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G"; 
const CATALOG_URL = "https://wa.me/c/YOUR_NUMBER_HERE"; 

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- الشعار: "ضجة في وجه الغلاء" 🔥
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- نطاق الأسعار: تبدأ من 100 ريال وتصل إلى 7,000 ريال يمني (شمالي)، وفي المحافظات الجنوبية تضرب في 3 أضعاف. 💰
- رابط قناة الواتساب لمتابعة كل جديد يومياً: ${CHANNEL_URL} 📢
- رابط الكتالوج الشامل: ${CATALOG_URL} 📲
- طرق الدفع المتاحة: كاش عند الاستلام، محفظة جيب (777655115)، بنك الكريمي (777655115). 💳
`;

// ⚙️ إعدادات العميل المتوافقة مع السيرفرات السحابية المجانية و Docker
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

client.on('qr', (qr) => {
    console.log('\n--- امسح رمز QR التالي من الواتساب ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n✅✅ [ضجة AI] شغال بأعلى درجات الذكاء والاحترافية والإنتاجية!\n');
});

// 🧠 التوجيه البرمجي لشخصية الذكاء الاصطناعي
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

// 📸 دالة إرسال صورة عشوائية مع التسويق
async function sendMarketingPhoto(client, toChat, captionText) {
    const photosFolder = path.join(__dirname, 'photos');
    
    if (fs.existsSync(photosFolder)) {
        let allImages = [];
        const findImages = (dir) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    findImages(fullPath);
                } else if (file.match(/\.(jpg|jpeg|png)$/i)) {
                    allImages.push(fullPath);
                }
            }
        };
        findImages(photosFolder);

        if (allImages.length > 0) {
            const randomImgPath = allImages[Math.floor(Math.random() * allImages.length)];
            const media = MessageMedia.fromFilePath(randomImgPath);
            await client.sendMessage(toChat, media, { caption: captionText });
            return true;
        }
    }
    return false;
}

client.on('message_create', async msg => {
    if (msg.fromMe) return;

    try {
        let userQuery = msg.body || '';

        // 🎙️ إذا أرسل العميل بصمة صوتية
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

        // 📸 2️⃣ إرسال صورة تسويقية فوراً عند الترحيب أو طلب الصور
        const isGreetingOrCatalog = userQuery.includes('مرحبا') || userQuery.includes('سلام') || userQuery.includes('جديد') || userQuery.includes('عرض') || userQuery.includes('صور') || userQuery.includes('كتالوج') || userQuery.includes('بكم');

        if (isGreetingOrCatalog && !msg.hasMedia) {
            const captionMsg = `🔥 *أهلاً بك في ضجة مول للتخفيضات!* 🛍️✨\n\nوصلتنا حديثاً تشكيلة ترند روعة بأسعار تبدأ من 100 إلى 7000 ريال! 😍\n\n📲 لمتابعة كل جديد بالصور يومياً ادخل قناتنا:\n${CHANNEL_URL}`;
            
            const sentPhoto = await sendMarketingPhoto(client, msg.from, captionMsg);
            if (sentPhoto) return;
        }

        // 💬 3️⃣ رد الذكاء الاصطناعي
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
