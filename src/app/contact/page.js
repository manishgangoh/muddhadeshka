import InfoPage from "@/components/InfoPage";

export const metadata = {
  title: "संपर्क करें (Contact Us)",
  description: "मुद्दा देश का से संपर्क करें — सुझाव, शिकायत, विज्ञापन या किसी खबर को हटवाने के लिए।",
};

export default function ContactPage() {
  return (
    <InfoPage title="संपर्क करें">
      <p>आपके सुझाव, शिकायत, विज्ञापन से जुड़े सवाल या किसी खबर/कॉपीराइट से संबंधित अनुरोध के लिए हमसे संपर्क करें:</p>

      <h2>ईमेल</h2>
      <p><a href="mailto:muddhadeshka@gmail.com">muddhadeshka@gmail.com</a></p>

      <h2>सोशल मीडिया</h2>
      <ul>
        <li>Instagram: <a href="https://www.instagram.com/muddhadeshka/" target="_blank" rel="noopener noreferrer">@muddhadeshka</a></li>
      </ul>

      <h2>कॉपीराइट / कंटेंट हटवाना</h2>
      <p>अगर आप किसी प्रकाशक/स्रोत हैं और चाहते हैं कि आपकी सामग्री से जुड़ी कोई खबर हटाई जाए, तो कृपया ऊपर दिए ईमेल पर खबर का लिंक भेजें। हम उचित अनुरोध पर शीघ्र कार्रवाई करेंगे। अधिक जानकारी के लिए <a href="/disclaimer">डिस्क्लेमर</a> पढ़ें।</p>

      <p className="text-sm text-zinc-400">हम आमतौर पर 2-3 कार्यदिवसों में जवाब देने की कोशिश करते हैं।</p>
    </InfoPage>
  );
}
