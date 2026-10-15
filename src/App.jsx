import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// ============================================================================
// FRONTEND — React + TailwindCSS + socket.io-client
// ----------------------------------------------------------------------------
// Đọc theo thứ tự để hiểu luồng:
//
//   1. useEffect (chạy 1 lần khi App mount):
//      io() mở "đường dây" tới server, rồi socket.on(...) đăng ký
//      các "kênh" lắng nghe event mà server gửi xuống.
//   2. Người dùng thao tác (Join / Gửi / gõ phím):
//      socket.emit('tên-event', data) GỬI event lên server.
//   3. Cleanup khi unmount: socket.disconnect() đóng đường dây gọn gàng.
//
// Giao diện dùng TailwindCSS: mỗi className là một utility
// (bg-white, rounded-xl, p-4, ...) — không còn object styles riêng.
// React còn tự escape dữ liệu khi render nên không cần hàm esc() nữa.
// ============================================================================

// Component nhỏ để khỏi lặp className cho thẻ <code> trong các thẻ khái niệm.
const Code = ({ children }) => (
  <code className="bg-[#eef1f7] px-1.5 py-px rounded-md text-xs font-mono">
    {children}
  </code>
);

const CONCEPTS = [
  {
    title: "🔌 1. Kết nối duy trì",
    body: (
      <>
        HTTP: hỏi → đáp → <i>đóng</i>.<br />
        Socket: mở <b>1 đường dây luôn mở</b>, 2 chiều — server có thể{" "}
        <b>chủ động</b> đẩy dữ liệu xuống bất cứ lúc nào.
      </>
    ),
  },
  {
    title: "📡 2. emit / on",
    body: (
      <>
        <Code>emit('tên-event', data)</Code> = gửi.
        <br />
        <Code>on('tên-event', fn)</Code> = lắng nghe.
        <br />
        Mọi thứ qua socket đều là <b>event có tên</b>.
      </>
    ),
  },
  {
    title: "📢 3. Gửi cho ai?",
    body: (
      <>
        <Code>socket.emit</Code> → riêng mình.
        <br />
        <Code>broadcast.emit</Code> → tất cả <b>trừ</b> mình.
        <br />
        <Code>io.emit</Code> → <b>tất cả</b> mọi người.
      </>
    ),
  },
  {
    title: "🔄 4. Vòng đời",
    body: (
      <>
        <Code>connection</Code> → trao đổi event → <Code>disconnect</Code> (tự
        động khi tắt tab/mất mạng). HTTP thuần không biết client "còn đó hay đã
        đi".
      </>
    ),
  },
];

export default function App() {
  const [nameInput, setNameInput] = useState("");
  const [draft, setDraft] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]); // [{kind:'chat'|'sys', ...}]
  const [online, setOnline] = useState([]);
  const [typingName, setTypingName] = useState("");

  const socketRef = useRef(null);
  const myNameRef = useRef(null); // ref để dùng trong handler đăng ký 1 lần
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);

  const pushMsg = (msg) => setMessages((prev) => [...prev, msg]);

  // ── BƯỚC 1: mở "đường dây" + đăng ký các kênh lắng nghe (chạy 1 lần) ──────
  useEffect(() => {
    const socket = io(); // cùng origin — ở dev, Vite proxy /socket.io → API :3001
    socketRef.current = socket;

    // Mỗi socket.on(...) là một "kênh" riêng. Server emit event nào
    // thì đúng handler đó chạy — realtime: không cần F5, không cần gọi API.
    socket.on("chat-message", ({ name, msg, time }) =>
      pushMsg({ kind: "chat", name, msg, time }),
    );
    socket.on("user-joined", (text) =>
      pushMsg({ kind: "sys", text: `👋 ${text}` }),
    );
    socket.on("user-left", (text) =>
      pushMsg({ kind: "sys", text: `👋 ${text}` }),
    );
    socket.on("online-list", (names) => setOnline(names));
    socket.on("typing", (n) => {
      if (n === myNameRef.current) return;
      setTypingName(n);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingName(""), 1500);
    });
    socket.on("disconnect", () =>
      pushMsg({ kind: "sys", text: "⚠️ Mất kết nối tới server..." }),
    );

    return () => {
      socket.disconnect(); // cleanup: đóng đường dây khi component unmount
      socketRef.current = null;
    };
  }, []);

  // Tự cuộn xuống tin mới nhất
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── BƯỚC 2: các thao tác GỬI event lên server ─────────────────────────────
  const join = () => {
    const n = nameInput.trim();
    if (!n || !socketRef.current) return;
    myNameRef.current = n;
    socketRef.current.emit("join", n); // ← emit = gửi event lên server
    setJoined(true);
    pushMsg({
      kind: "sys",
      text: `Bạn đã tham gia với tên "${n}". Chào mừng! 🎉`,
    });
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat-message", text); // server nhận → io.emit cho TẤT CẢ
    setDraft("");
  };

  const onType = (e) => {
    setDraft(e.target.value);
    socketRef.current?.emit("typing"); // server broadcast cho NGƯỜI KHÁC
  };

  return (
    <div className="bg-[#f4f6fb] min-h-screen text-[#1e2430] font-sans">
      <div className="max-w-[960px] mx-auto p-6">
        <h1 className="text-[22px] font-bold m-0">
          🔌 Socket Demo — Hiểu Socket trong 5 phút
        </h1>
        <p className="text-[#5b6478] mt-1 mb-5 text-sm">
          Mở <b>2 tab</b> trang này → join với 2 tên khác nhau → chat qua lại và
          xem realtime.
        </p>

        <div className="grid gap-3 mb-5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          {CONCEPTS.map((c) => (
            <div
              key={c.title}
              className="bg-white border border-[#e2e7f0] rounded-xl p-3.5 text-[13px] leading-[1.55]"
            >
              <b className="block mb-1.5 text-sm">{c.title}</b>
              {c.body}
            </div>
          ))}
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-[1fr_220px]">
          <div className="bg-white border border-[#e2e7f0] rounded-xl p-4">
            {!joined && (
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-[#d5dbe8] outline-none focus:border-[#4f7cff]"
                  placeholder="Nhập tên của bạn rồi Join..."
                  maxLength={20}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                />
                <button
                  className="text-sm px-4 py-2.5 rounded-lg bg-[#4f7cff] text-white font-semibold hover:bg-[#3d68e0] cursor-pointer"
                  onClick={join}
                >
                  Join
                </button>
              </div>
            )}

            <div className="h-[320px] overflow-y-auto border border-[#eef1f7] rounded-lg p-2.5 mb-2.5 bg-[#fafbfe] text-sm">
              {messages.map((m, i) =>
                m.kind === "chat" ? (
                  <div key={i} className="mb-2 leading-[1.45]">
                    <span className="text-[#8a93a8] text-xs">
                      [{m.time}] <b>{m.name}</b>:
                    </span>{" "}
                    {m.msg}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="mb-2 leading-[1.45] text-[#8a93a8] italic text-[13px]"
                  >
                    {m.text}
                  </div>
                ),
              )}
              <div ref={bottomRef} />
            </div>

            <div className="min-h-[20px] text-xs text-[#8a93a8] italic mb-1.5">
              {typingName ? `${typingName} đang gõ...` : ""}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-[#d5dbe8] outline-none focus:border-[#4f7cff] disabled:bg-[#f4f6fb]"
                placeholder="Nhập tin nhắn..."
                disabled={!joined}
                value={draft}
                onChange={onType}
                onKeyDown={(e) => e.key === "Enter" && send()}
              />
              <button
                className="text-sm px-4 py-2.5 rounded-lg bg-[#4f7cff] text-white font-semibold hover:bg-[#3d68e0] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={!joined}
                onClick={send}
              >
                Gửi
              </button>
            </div>

            <p className="text-xs text-[#8a93a8] mt-3.5 leading-[1.6]">
              💡 Thử: tắt 1 tab → tab còn lại thấy "đã rời phòng" ngay lập tức
              (event <Code>disconnect</Code>).
              <br />
              💡 Mở DevTools → Network → WS → click vào frame để xem các event
              chạy qua đường dây.
            </p>
          </div>

          <div className="bg-white border border-[#e2e7f0] rounded-xl p-4">
            <h3 className="text-sm mb-2.5 font-bold">
              🟢 Đang online ({online.length})
            </h3>
            <ul className="list-none p-0 m-0 text-[13px]">
              {online.map((n) => (
                <li key={n} className="py-1.5 border-b border-[#f0f2f7]">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
