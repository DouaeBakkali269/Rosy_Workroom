import { useLanguage } from '../context/LanguageContext'

export default function SweetFeedbackSection({ formData, setFormData, sent, isSending, sendError, handleSubmit }) {
  const { t } = useLanguage()

  return (
    <section className="relative mx-[60px] mt-[64px] overflow-hidden rounded-none border-2 border-[rgba(233,157,186,0.52)] bg-[rgba(255,255,255,0.4)] px-7 pb-7 pt-9 shadow-[0_10px_30px_rgba(213,111,147,0.25),0_2px_8px_rgba(233,157,186,0.3)] backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] transition-all duration-200 hover:border-[rgba(214,82,142,0.74)] hover:shadow-[0_14px_34px_rgba(213,111,147,0.26),0_2px_8px_rgba(233,157,186,0.34)] [font-family:'Architects_Daughter',cursive] max-md:mx-5 max-md:mt-10 max-md:px-4">
      <div className="pointer-events-none absolute inset-0 opacity-65 bg-[radial-gradient(circle,rgba(244,193,213,0.34)_1.4px,transparent_1.4px)] [background-size:22px_22px]" />
      <div className="pointer-events-none absolute inset-3 rounded-[18px] border border-[#efbfd2] bg-[radial-gradient(circle,rgba(244,193,213,0.2)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative z-10 mt-2 grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <div className="mx-auto w-full max-w-[560px] space-y-3">
          <div className="max-w-[480px] pl-6 max-md:pl-0">
            <div className="mb-1 flex items-center gap-2 text-[#df89ac]">
              <span className="text-[13px]">✿</span>
              <img src="/tie.png" alt={t('feedback.tieAlt')} className="h-[90px] w-auto object-contain" />
              <span className="text-[13px]">✿</span>
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#b46887]">{t('feedback.sweetNote')}</p>
            <h2 className="mt-1 text-[38px] leading-tight text-[#6d3a55]">{t('feedback.shareTitle')}</h2>
            <p className="mt-2 text-[16px] text-[#80586c] max-md:text-[14px]">{t('feedback.shareSubtitle')}</p>
          </div>

          <div className="mt-4 rounded-[2px] border-2 border-[#e18cac] bg-[linear-gradient(90deg,#f4a8c3,#ea85aa)] px-3 py-2 text-[15px] font-semibold text-white shadow-[0_4px_8px_rgba(220,125,161,0.2)] transition-all duration-200 hover:border-[#cb6f96] hover:bg-[linear-gradient(90deg,#ef94b6,#dd6f99)] hover:shadow-[0_10px_18px_rgba(208,102,145,0.32)]">
            {t('feedback.readEvery')}
          </div>

          <div className="mt-3 text-[#8a5a70]">
            <p className="text-[15px] font-semibold text-[#7a3e5b]">{t('feedback.beforeSending')}</p>
            <ul className="mt-2 space-y-1 text-[14px] leading-6">
              <li>{t('feedback.tipOne')}</li>
              <li>{t('feedback.tipTwo')}</li>
              <li>{t('feedback.tipThree')}</li>
            </ul>
          </div>

        </div>

        <div className="flex items-center">
          <form
            className="relative w-full rounded-[3px] border-[3px] border-[#e59bb9] bg-transparent p-4 shadow-[0_4px_10px_rgba(232,149,183,0.1)] transition-all duration-200 hover:border-[#d9789e] hover:shadow-[0_10px_20px_rgba(220,125,161,0.26)]"
            onSubmit={handleSubmit}
          >
            <div className="pointer-events-none absolute inset-2 rounded-[1px] border-2 border-[#efbfd2] bg-transparent" />
            <div className="relative z-10 space-y-4">
              <div className="text-center text-[15px] text-[#b46887]">♡ {t('feedback.softNote')} ♡</div>

              <input
                className="h-10 w-full appearance-none rounded-[1px] border-[3px] border-solid border-[#df86a7] bg-transparent px-3 text-[14px] text-[#7a3e5b] [font-family:'Architects_Daughter',cursive] placeholder:[font-family:'Architects_Daughter',cursive] placeholder:text-[13px] placeholder:text-[#9a6b82] shadow-[inset_0_1px_3px_rgba(232,176,198,0.18)] outline-none transition-all duration-200 hover:border-[#c95f8d] hover:shadow-[0_8px_16px_rgba(220,125,161,0.18)] focus:border-[#c95f8d] focus-visible:outline-none"
                type="text"
                placeholder={t('feedback.namePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <select
                className="h-10 w-full appearance-none rounded-[1px] border-[3px] border-solid border-[#df86a7] bg-transparent px-3 text-[14px] text-[#7a3e5b] [font-family:'Architects_Daughter',cursive] shadow-[inset_0_1px_3px_rgba(232,176,198,0.18)] outline-none transition-all duration-200 hover:border-[#c95f8d] hover:shadow-[0_8px_16px_rgba(220,125,161,0.18)] focus:border-[#c95f8d] focus-visible:outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="feature">{t('feedback.typeFeature')}</option>
                <option value="bug">{t('feedback.typeBug')}</option>
                <option value="feedback">{t('feedback.typeGeneral')}</option>
              </select>

              <textarea
                className="min-h-[148px] w-full resize-none appearance-none rounded-[1px] border-[3px] border-solid border-[#df86a7] bg-transparent p-3 text-[14px] leading-[1.35] text-[#7a3e5b] [font-family:'Architects_Daughter',cursive] placeholder:[font-family:'Architects_Daughter',cursive] placeholder:text-[13px] placeholder:text-[#9a6b82] shadow-[inset_0_1px_3px_rgba(232,176,198,0.18)] outline-none transition-all duration-200 hover:border-[#c95f8d] hover:shadow-[0_8px_16px_rgba(220,125,161,0.18)] focus:border-[#c95f8d] focus-visible:outline-none"
                placeholder={t('feedback.messagePlaceholder')}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />

              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSending}
                  className={`inline-flex h-9 min-w-[112px] appearance-none items-center justify-center rounded-[1px] border-[3px] border-solid border-[#d9789e] bg-[linear-gradient(180deg,#f8c5d8_0%,#e885ad_95%)] px-4 text-[15px] font-['Architects_Daughter'] font-semibold tracking-[0.02em] text-white shadow-[0_5px_10px_rgba(221,114,157,0.2)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bf5e87] hover:bg-[linear-gradient(180deg,#ef9fc0_0%,#d76392_95%)] hover:shadow-[0_10px_18px_rgba(208,102,145,0.36)] focus-visible:outline-none ${isSending ? 'cursor-not-allowed opacity-70 hover:translate-y-0' : ''}`}
                >
                  {isSending ? 'Sending...' : t('feedback.send')}
                </button>
                {sent && <span className="text-[12px] font-semibold text-[#8b4a63]">{t('feedback.thankYou')}</span>}
              </div>
              {sendError && <div className="text-center text-[13px] font-semibold text-[#b14a72]">{sendError}</div>}
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
