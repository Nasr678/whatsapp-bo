const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

const groq = new Groq({ apiKey: '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' });

const CHANNEL_URL = "https://whatsapp.com/channel/0029VbD5We92975GDmPC2N0G"; 
const CATALOG_URL = "https://wa.me/c/YOUR_NUMBER_HERE"; 

const dajahStoreInfo = `
- المتجر: ضجة مول للتخفيضات 🛍️
- الشعار: "ضجة في وجه الغلاء" 🔥
- العنوان: صنعاء — شميلة — شارع تعز — أمام برافو سنتر. 📍
- نطاق الأسعار: تبدأ من 100 ريال وتصل إلى 7,000 ريال يمني (شمالي). 💰
- رابط قناة الواتساب: ${CHANNEL_URL} 📢
- طرق الدفع: كاش، محفظة جيب (777655115)، بنك الكريمي (777655115). 💳
`;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--no-zygote']
    }
});

// 📲 الربط برقم الهاتف واستخراج الرمز المكون من 8 أرقام
client.on('qr', async () => {
    const phoneNumber = "967783103638"; 
    const code = await client.requestPairingCode(phoneNumber);
    console.log('\n==================================');
    console.log(`🔑 رمز ربط الواتساب الخاص بك هو: ${code}`);
    console.log('==================================\n');
});

client.on('ready', () => {
    console.log('\n✅✅ [ضجة AI] متصل ومستعد للرد على الزبائن!\n');
});

const systemPrompt = `
أنت "ضجة AI" ✨، المساعد الشخصي الذكي لمتجر "ضجة مول للتخفيضات".
تتحدث بأسلوب بشري، مُقنع، ومختصر جداً (بلسان خدمة العملاء اليمنية).
بيانات المتجر: ${dajahStoreInfo}
`;

client.on('message_create', async msg => {
    if (msg.fromMe) return;

    try {
        let userQuery = msg.body || '';
        if (!userQuery || userQuery.trim() === '') return;

        const isOrder = userQuery.includes('طلب') || userQuery.includes('أطلب') || userQuery.includes('أشتري') || userQuery.includes('حجز');
        if (isOrder && !userQuery.includes('استمارة')) {
            const orderForm = `📝 *استمارة حجز الطلب — ضجة مول* 🛍️✨\n\nأرسل لنا بياناتك لتأكيد الطلب:\n👤 *الاسم:* \n📱 *رقم التواصل:*\n📍 *العنوان:*\n👗 *اسم الموديل والسعر:*`;
            await msg.reply(orderForm);
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

        let replyText = chatCompletion.choices[0]?.message?.content || 'أهلاً بك في ضجة مول! ✨';
        await msg.reply(replyText.trim());

    } catch (error) {
        console.error('خطأ المعالجة:', error.message);
    }
});

console.log('جاري تشغيل النظام...');
client.initialize();
