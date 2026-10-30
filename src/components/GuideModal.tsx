import React from 'react';
import { BookOpen, Sparkles, Music, Mic, Sliders, WifiOff, X } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl w-full shadow-2xl space-y-6 my-8 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                คู่มือการใช้งานและสาระดนตรีไทย (Studio Knowledge Guide)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ระบบสังเคราะห์เสียงไทย การเข้าถึง และทฤษฎีดนตรีไทยเดิมสำหรับศิลปิน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-6 text-slate-700 dark:text-slate-300 text-sm">
          {/* Section 1: Thai TTS & Natural Voices */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Mic className="w-4 h-4 text-amber-500" />
              <span>1. การพากย์เสียงภาษาไทยแบบธรรมชาติ (Natural Thai TTS)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              แอปพลิเคชันใช้โมเดลเสียง <strong>Gemini 3.8 Flash Lite TTS</strong> และ <strong>Web Speech API</strong> ซึ่งออกเสียงพยัญชนะ สระ และวรรณยุกต์ไทย (สามัญ เอก โท ตรี จัตวา) ได้อย่างเป็นธรรมชาติ มีผู้พากย์ให้เลือกหลายบุคลิก ทั้งเสียงหญิงอบอุ่น เสียงชายสดใส เสียงทางการอ่านข่าว และเสียงผู้เฒ่าเล่านิทาน
            </p>
          </div>

          {/* Section 2: Accessibility (Speed & Pitch) */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span>2. การปรับความเร็วและระดับเสียงเพื่อการเข้าถึง (Accessibility)</span>
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-5">
              <li>
                <strong>ความเร็ว (Speed: 0.5x - 2.0x):</strong> ปรับลดความเร็วลง (เช่น 0.75x) เพื่อช่วยให้ผู้สูงอายุหรือผู้ที่กำลังเรียนภาษาไทยสามารถฟังวรรณยุกต์ได้อย่างชัดเจน
              </li>
              <li>
                <strong>ระดับเสียง (Pitch / Key):</strong> ปรับระดับความถี่เสียงให้เหมาะสมกับความไวในการได้ยินของผู้ใช้งาน หรือปรับให้เข้ากับคีย์ของบทเพลงไทย
              </li>
            </ul>
          </div>

          {/* Section 3: Thai Traditional Musical System & 7-TET */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Music className="w-4 h-4 text-indigo-500" />
              <span>3. ระบบบันไดเสียงไทยเดิม 7 เสียงเท่ากัน (7-TET Heptatonic Scale)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ในดนตรีไทยเดิมโบราณ 1 ช่วงคู่แปด (Octave) จะถูกแบ่งออกเป็น <strong>7 ช่วงเสียงเท่ากัน</strong> โดยแต่ละช่วงห่างกันประมาณ <strong>171.43 Cents</strong> (ต่างจากระบบสากลที่มี 12 ครึ่งเสียง) ทำให้ดนตรีไทยมีเอกลักษณ์เฉพาะตัว ชวนหลงใหลและมีมนต์ขลัง คุณสามารถสลับระหว่างระบบ <strong>7 เสียงไทยเดิม</strong> หรือระบบ <strong>เพนทาทอนิก</strong> ได้ตามต้องการ
            </p>
          </div>

          {/* Section 4: Thai Traditional Instruments */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>4. เครื่องดนตรีไทยที่จำลองเสียงในระบบ</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🪵 ระนาดเอก (Ranat Ek):</strong> เครื่องตีไม้เสียงใส เป็นผู้นำวงในการดำเนินทำนองรวดเร็ว
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🎋 ระนาดทุ้ม (Ranat Thum):</strong> ลูกระนาดไม้ไผ่ เสียงทุ้มนุ่ม หยอกล้อทำนอง
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🔔 ฆ้องวงใหญ่ (Khong Wong Yai):</strong> ฆ้องทองสัมฤทธิ์ เสียงกังวาน เป็นแก่นทำนองหลัก
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🎻 ซอดวง (Saw Duang):</strong> เครื่องสายสีเสียงแหลมหวาน ทำนองพริ้วไหว
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🪈 ขลุ่ยเพียงออ (Khlui):</strong> ขลุ่ยไม้ไผ่เป่าลมแผ่วพริ้ว สำเนียงหวานซึ้ง
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>✨ ฉิ่ง - ฉาบ (Ching &amp; Chap):</strong> ฉิ่งคุมจังหวะหลักของเพลง (เสียงฉิ่งเปิดกังวาน / เสียงฉาบปิดกระชับ)
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <strong>🥁 ตะโพน &amp; กลองแขก:</strong> กลองจังหวะศักดิ์สิทธิ์และกลองคู่ซิงโคเพชัน
              </div>
            </div>
          </div>

          {/* Section 5: Offline Storage Guarantee */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-rose-500" />
              <span>5. การบันทึกและฟังแบบออฟไลน์ (Offline Guarantee)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ทุกไฟล์เสียงที่สร้างจะถูกเก็บไว้ใน <strong>IndexedDB</strong> ในเบราว์เซอร์ของคุณโดยอัตโนมัติ ไม่มีการส่งข้อมูลส่วนตัวออกไปภายนอก และคุณสามารถฟังซ้ำหรือปรับแต่งเสียงได้แม้ไม่มีสัญญาณอินเทอร์เน็ต
            </p>
          </div>

          {/* Section 6: Free Tier Token Limits */}
          <div className="space-y-2">
            <h3 className="font-heading font-semibold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="text-amber-500">⚡</span>
              <span>6. การใช้งานโทเค็นและขีดจำกัดเวอร์ชันฟรี (Free Tier Limits)</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              แอปพลิเคชันเชื่อมต่อกับโมเดล Google AI Studio เวอร์ชันฟรี โดยมีขีดจำกัดโควตามาตรฐานดังนี้:
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc pl-5">
              <li><strong>1,500 คำขอต่อวัน (RPD):</strong> สังเคราะห์เสียงและประพันธ์คำร้องได้สูงสุด 1,500 ครั้งต่อวันโดยไม่มีค่าใช้จ่าย</li>
              <li><strong>15 คำขอต่อนาที (RPM):</strong> อัตราการเรียกใช้งานสูงสุด 15 ครั้งใน 1 นาที</li>
              <li><strong>1,000,000 โทเค็นต่อนาที (TPM):</strong> ขีดจำกัดความเร็วการประมวลผลโทเค็น</li>
              <li><strong>โหมดออฟไลน์ (0 โทเค็น):</strong> สังเคราะห์เสียงด้วยระบบในเครื่องได้ฟรีไม่จำกัดจำนวนครั้ง</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            เข้าใจแล้ว &bull; เริ่มใช้งาน
          </button>
        </div>
      </div>
    </div>
  );
};
