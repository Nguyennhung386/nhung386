import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { Clipboard, Download, Video, Music2, Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import banner from '@/assets/download-banner.jpg';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'SaveTok — Tải Video TikTok Không Logo' },
    { name: 'description', content: 'SaveTok: giao diện tải video và nhạc TikTok bằng liên kết, hỗ trợ điện thoại và máy tính.' },
    { property: 'og:title', content: 'SaveTok — Tải Video TikTok Không Logo' },
    { property: 'og:description', content: 'Dán liên kết TikTok để bắt đầu. Giao diện tiếng Việt đơn giản, dễ sử dụng.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});
// Download service base URL: empty in dev (Vite proxies /api/dl), the hosted service URL in production.
const DOWNLOAD_API = (import.meta.env.VITE_DOWNLOAD_API_URL ?? '').replace(/\/$/, '');
const sections = ['Cách tải video TikTok không logo', 'Tải nhạc TikTok', 'Vì sao nên chọn', 'Thiết bị hỗ trợ', 'Về SaveTok', 'Câu hỏi thường gặp'];
function Index() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [valid, setValid] = useState(false);
  const [cookies, setCookies] = useState(true);
  const [language, setLanguage] = useState('vi');
  const english = language === 'en';
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    let isTikTok = false;
    try { const link = new URL(url.trim()); isTikTok = link.protocol === 'https:' && (link.hostname === 'tiktok.com' || link.hostname.endsWith('.tiktok.com')); } catch { /* Invalid links show inline feedback. */ }
    if (!isTikTok) {
      setValid(false);
      setMessage(english ? 'Please enter a valid TikTok link (https://www.tiktok.com/…).' : 'Vui lòng dán liên kết TikTok hợp lệ (https://www.tiktok.com/…).');
      return;
    }
    setLoading(true);
    setValid(true);
    setMessage(format === 'mp3'
      ? (english ? 'Extracting MP3, please wait…' : 'Đang tách nhạc MP3, vui lòng chờ…')
      : (english ? 'Processing video, please wait…' : 'Đang xử lý video, vui lòng chờ…'));
    try {
      const res = await fetch(`${DOWNLOAD_API}/api/dl/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim(), format }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || (english ? 'Download service is not available.' : 'Dịch vụ tải chưa chạy hoặc không phản hồi.'));
      const a = document.createElement('a');
      a.href = `${DOWNLOAD_API}/api/dl/file/${data.id}`;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage(english ? `Done: ${data.filename}` : `Đã tải xong: ${data.filename}`);
    } catch (err) {
      setValid(false);
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }
  return <>
    <header className="site-header"><div className="header-inner">
      <a href="/" className="wordmark" aria-label="SaveTok trang chủ">SAVETOK</a>
      <div className="flex items-center gap-2 text-muted-foreground"><Globe size={14}/><select aria-label="Ngôn ngữ" className="language-select" value={language} onChange={e => setLanguage(e.target.value)}><option value="vi">Tiếng Việt</option><option value="en">English</option></select></div>
    </div></header>
    <main className="main-content">
      <section className="intro">
        <h1>{english ? <>SaveTok - TikTok Video Downloader,<br/>Download TikTok Music</> : <>SaveTok - Tải Video TikTok Không Logo,<br/>Tải Nhạc TikTok Miễn Phí</>}</h1>
        <p className="intro-description">{english ? 'Download TikTok videos without a watermark with SaveTok. MP3 music and HD videos on your phone and computer, without installing an app.' : <>Tải video TikTok không logo, watermark với SaveTok. Hỗ trợ tải <a className="inline-link" href="#section-2"><Music2 size={12} className="inline"/> nhạc</a> MP3, video HD, 4K miễn phí trên điện thoại (iPhone, Android) và máy tính, không cần cài đặt.</>} {' '}<a href="#section-1" className="online-badge"><Video size={12}/>{english ? 'Online Video' : 'Dùng Video Online'}</a></p>
        <div className="format-toggle" role="radiogroup" aria-label={english ? 'Download format' : 'Định dạng tải'}>
          {([['mp4', <Video size={14}/>, english ? 'Video MP4' : 'Video MP4'], ['mp3', <Music2 size={14}/>, english ? 'Music MP3' : 'Nhạc MP3']] as const).map(([value, icon, label]) =>
            <button key={value} type="button" role="radio" aria-checked={format === value} className={format === value ? 'active' : ''} disabled={loading} onClick={() => setFormat(value)}>{icon}{label}</button>)}
        </div>
        <form className="download-form" onSubmit={submit}>
          <label className="link-field"><Clipboard size={20} className="shrink-0"/><input aria-label="Liên kết TikTok" placeholder={english ? 'Paste your TikTok link here…' : 'Dán liên kết TikTok vào đây…'} value={url} onChange={e => {setUrl(e.target.value); setMessage('');}} /></label>
          <Button type="submit" className="download-action" disabled={loading}><Download size={17}/>{loading ? (english ? 'PROCESSING…' : 'ĐANG XỬ LÝ…') : (english ? 'DOWNLOAD' : 'TẢI XUỐNG')}</Button>
        </form>
        {message && <p role="status" className={`form-message ${valid ? 'notice' : ''}`}>{message}</p>}
        <div className="browser-links">
          <a className="browser-link" href="https://chromewebstore.google.com/search/savetok" target="_blank" rel="noreferrer"><ChromeMark/><span><small>SAVETOK</small>Chrome Web Store</span></a>
          <a className="browser-link" href="https://addons.mozilla.org/vi/firefox/search/?q=savetok" target="_blank" rel="noreferrer"><span className="browser-symbol text-info flex items-center justify-center"><Globe size={30}/></span><span><small>SAVETOK</small>Firefox Add-ons</span></a>
        </div>
      </section>
      <aside className="disclaimer">Dịch vụ này không liên kết với ByteDance, TikTok hoặc Meta. Chúng tôi không lưu trữ video trên máy chủ của mình. Bằng cách sử dụng dịch vụ này, bạn đồng ý với <a href="#terms">Điều khoản sử dụng</a> của chúng tôi.</aside>
      <nav aria-label="Mục lục"><ol className="contents">{sections.map((section, i) => <li key={section}><a href={`#section-${i+1}`}>{i+1}. {section}</a></li>)}</ol></nav>
      <figure className="m-0"><img className="banner" src={banner} alt="Tải video TikTok nhanh siêu cấp — 1 click, no watermark" width={1280} height={720}/><figcaption className="banner-caption">SaveTok - Công cụ xóa logo TikTok, tải video TikTok miễn phí chất lượng cao <span className="online-badge"><Video size={11}/>Video không logo</span></figcaption></figure>
      <article className="article">
        <p><strong>Để tải video TikTok không logo:</strong> sao chép link video, dán vào ô trên <strong>SaveTok</strong> rồi nhấn Tải xuống — file MP4 sạch watermark về máy trong vài giây. Miễn phí, không cài app, không đăng ký, không giới hạn số lượt tải.</p>
        <p><strong>SaveTok</strong> <a href="#section-1" className="inline-link">tải video TikTok</a> ở chất lượng HD, 4K, <a href="#section-2" className="inline-link">tách nhạc MP3</a>, hoạt động trên điện thoại và máy tính. Quen tiếng Anh thì đây cũng là một <strong>TikTok Downloader</strong> — <a href="#section-1" className="inline-link">download</a> video no watermark.</p>
        <section id="section-1"><h2>Cách tải video TikTok không logo</h2><div className="steps">{[['Sao chép liên kết', 'Mở TikTok, chọn video yêu thích. Nhấn Chia sẻ, sau đó chọn Sao chép liên kết.'], ['Dán liên kết', 'Dán liên kết video vào ô phía trên trang SaveTok.'], ['Tải video', 'Nhấn Tải xuống để bắt đầu xử lý liên kết video.']].map(([title, text], i) => <div className="step" key={title}><div className="step-title"><span className="step-number">{i+1}</span>{title}</div><p>{text}</p></div>)}</div></section>
        <section id="section-2"><h2>Tải nhạc TikTok</h2><p>Sao chép liên kết video có âm thanh bạn yêu thích, chọn <strong>Nhạc MP3</strong> rồi dán liên kết vào SaveTok để tách nhạc. Hãy tôn trọng quyền tác giả khi sử dụng nội dung tải về.</p></section>
        <section id="section-3"><h2>Vì sao nên chọn SaveTok?</h2><ul className="feature-list">{['Giao diện đơn giản, dễ sử dụng', 'Không cần cài đặt ứng dụng', 'Dán liên kết ngay trên trình duyệt', 'Hỗ trợ điện thoại và máy tính'].map(item => <li key={item}><Check/>{item}</li>)}</ul></section>
        <section id="section-4"><h2>Thiết bị hỗ trợ</h2><p>Truy cập SaveTok bằng Safari, Chrome, Firefox hoặc Edge trên iPhone, iPad, điện thoại Android, Windows và macOS.</p></section>
        <section id="section-5"><h2>Về SaveTok</h2><p>SaveTok là công cụ tải video MP4 không logo và tách nhạc MP3 từ liên kết TikTok.</p></section>
        <section id="section-6" className="faq"><h2>Câu hỏi thường gặp</h2>{[['Tôi lấy liên kết video TikTok ở đâu?', 'Mở video trong TikTok, nhấn nút Chia sẻ rồi chọn Sao chép liên kết.'], ['Tôi có cần đăng nhập không?', 'Bạn không cần đăng nhập để dán và kiểm tra liên kết TikTok.'], ['Tại sao tôi chưa tải được video?', 'Hãy kiểm tra liên kết có đúng là video TikTok công khai. Một số video bị TikTok giới hạn theo khu vực nên không tải được.']].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
        <section id="terms"><h2>Điều khoản sử dụng</h2><p>Chỉ tải nội dung thuộc quyền sở hữu của bạn hoặc được tác giả cho phép. Không sử dụng nội dung để vi phạm bản quyền. SaveTok không liên kết với TikTok hoặc ByteDance.</p></section>
      </article>
    </main>
    <footer className="footer"><a href="/" className="wordmark">SAVETOK</a><p>© {new Date().getFullYear()} SaveTok · <a href="#terms" className="inline-link">Điều khoản sử dụng</a></p></footer>
    {cookies && <aside className="cookie-notice" aria-label="Thông báo cookie"><p>Trang web sử dụng cookie để cải thiện trải nghiệm của bạn. Bằng cách tiếp tục, bạn đồng ý với <a href="#terms" className="inline-link underline">Điều khoản sử dụng</a> của chúng tôi.</p><Button className="cookie-accept" onClick={() => setCookies(false)}>Đồng ý</Button></aside>}
  </>;
}
function ChromeMark() { return <svg className="browser-symbol text-info" viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor"/><circle cx="16" cy="16" r="6" stroke="var(--primary-foreground)" strokeWidth="1.5"/><path d="M16 10h13M11 19 5 8M19 21l-6 10" stroke="var(--primary-foreground)" strokeWidth="1.5"/></svg>; }
