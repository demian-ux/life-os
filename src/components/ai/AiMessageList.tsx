import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

type AiMessageView = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: Date;
};

export function AiMessageList({ messages }: { messages: AiMessageView[] }) {
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Start a conversation with Quill."
        body="Ask me to plan or summarize. I won't write anything without your nod."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-[10px] m-0 p-0 list-none">
      {messages.map((m) => {
        if (m.role === "SYSTEM") {
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 px-[14px] py-[12px] bg-gold-100 border-[1.5px] border-[color:var(--warn-500)] rounded-md"
            >
              <Image
                src="/lifeos/mascot-quill-sleep.svg"
                alt=""
                width={56}
                height={56}
              />
              <div className="flex-1 min-w-0">
                <div className="font-[var(--font-display)] font-semibold text-[15px] text-ink-800">
                  Quill got confused.
                </div>
                <div className="font-[var(--font-mono)] text-[12.5px] text-bark-500 mt-[2px] whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            </li>
          );
        }
        const isUser = m.role === "USER";
        return (
          <li key={m.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "px-[14px] py-[10px] rounded-[14px] max-w-[80%] text-[14px] leading-[1.5] whitespace-pre-wrap",
                isUser
                  ? "bg-coral-500 text-white rounded-br-[4px]"
                  : "bg-cream-100 text-ink-800 border border-cream-200 rounded-bl-[4px]",
              )}
            >
              {m.content}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
