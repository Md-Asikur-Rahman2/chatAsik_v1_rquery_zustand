"use client";
import React, {
  ChangeEvent,
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import EmojiPicker, { Theme, EmojiStyle, SuggestionMode } from "emoji-picker-react";
import { useClickAway } from "@uidotdev/usehooks";
import { useChatContext } from "@/context/ChatContext/ChatContextProvider";
import { join } from "path";
import { uuid } from "uuidv4";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  editMessage,
  replyMessage,
  sentMessage,
  updateMessageStatus,
} from "@/functions/messageActions";
import { useChatStore } from "@/store/useChat";
import useMessageStore from "@/store/useMessage";
import { useUserStore } from "@/store/useUser";
import { useTypingStore } from "@/store/useTyping";
import TypingIndicatot from "./TypingIndicator";
import useEditReplyStore from "@/store/useEditReply";
import { IoMdClose, IoMdPhotos } from "react-icons/io";
import { MdAddAPhoto, MdOutlineKeyboardVoice, MdVoiceChat } from "react-icons/md";
import { RiEmojiStickerLine } from "react-icons/ri";
import ChatStatus from "./ChatStatus";
type Tmessage = {
  message: string | any;
};
type Temoji = {
  emoji: string;
};
const Input = () => {
  const { selectedChat } = useChatStore();
  const { socket } = useChatContext();
  const { currentUser } = useUserStore();
  const [message, setMessage] = useState<Tmessage>({ message: "" });
  const [openEmoji, setOpenEmoji] = useState(false);
  const { isTyping, content: typingContent, chatId: typingChatId } = useTypingStore();
  const { cancelEdit, cancelReply, isEdit, isReply } = useEditReplyStore();
  //clickOutside
  const clickRef: any = useClickAway(() => setOpenEmoji(false));
  //change message
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMessage((prev) => ({ ...prev, [name]: value }));
  };
  const timerRef = useRef<any | null>(null);
  useEffect(() => {
    if (message.message.trim() !== "") {
      socket.emit("startTyping", {
        content: message.message,
        chatId: selectedChat?.chatId,
        senderId: currentUser?._id,
        receiverId: selectedChat?.userId,
        isGroupChat: selectedChat?.isGroupChat,
      });
    } else {
      if (message.message.trim() === "") {
        socket.emit("stopTyping", {
          content: message.message,
          chatId: selectedChat?.chatId,
          senderId: currentUser?._id,
          receiverId: selectedChat?.userId,
          isGroupChat: selectedChat?.isGroupChat,
        });
      }
    }

    const timerLength = 2500;

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set a new timer
    timerRef.current = setTimeout(() => {
      // Check if the user is still typing after the delay
      if (message.message.trim() !== "") {
        socket.emit("stopTyping", {
          content: message.message,
          chatId: selectedChat?.chatId,
          senderId: currentUser?._id,
          receiverId: selectedChat?.userId,
          isGroupChat: selectedChat?.isGroupChat,
        });
      }
    }, timerLength);

    return () => {
      // Clear the timer on component unmount or when the dependency changes
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [message.message, currentUser, selectedChat, socket]);

  const onkeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit();
    }
  };
  //onsubmit
  // const { setMessage } = useMessageStore();
  const queryclient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => sentMessage(data),
    // mutationKey: ["messages"],
    onSuccess: (data) => {
      const socketData = {
        senderId: currentUser?._id,
        receiverId: selectedChat?.userId,
        chatId: selectedChat?.chatId,
        content: data.content,
        pic: currentUser?.pic,
        createAt: data.createdAt,
        isGroupChat: selectedChat?.isGroupChat,
      };
      socket.emit("sentMessage", socketData);
      toast.success("Message Sent!");
      setMessage({ message: "" });

      queryclient.invalidateQueries({
        queryKey: ["messages"],
      });
    },
  });

  //reply message mutation
  const replymutation = useMutation({
    mutationFn: (data) => replyMessage(data),
    // mutationKey: ["messages"],
    onSuccess: (data) => {
      const socketData = {
        senderId: currentUser?._id,
        receiverId: selectedChat?.userId,
        chatId: selectedChat?.chatId,
        content: data.content,
        pic: currentUser?.pic,
        createAt: data.createdAt,
        isGroupChat: selectedChat?.isGroupChat,
      };
      socket.emit("sentMessage", socketData);
      toast.success("Message Replied!");
      setMessage({ message: "" });

      queryclient.invalidateQueries({
        queryKey: ["messages"],
      });
    },
  });

  //edit message mutation
  const editmutation = useMutation({
    mutationFn: (data) => editMessage(data),
    // mutationKey: ["messages"],
    onSuccess: (data) => {
      const socketData = {
        senderId: currentUser?._id,
        receiverId: selectedChat?.userId,
        chatId: selectedChat?.chatId,
        content: data.content,
        pic: currentUser?.pic,
        createAt: data.createdAt,
        isGroupChat: selectedChat?.isGroupChat,
      };
      socket.emit("sentMessage", socketData);
      toast.success("Message Edited!");
      setMessage({ message: "" });

      queryclient.invalidateQueries({
        queryKey: ["messages"],
      });
    },
  });
  const onSubmit = () => {
    if (!selectedChat?.chatId) {
      return;
    }
    const messageData = {
      chatId: selectedChat?.chatId,
      content: message.message ? message.message : "😍",
    };
    mutation.mutateAsync(messageData as any);
  };
  //edit handler
  const onEditSubmit = () => {
    if (!selectedChat?.chatId && !isEdit) {
      return;
    }
    const messageData = {
      messageId: isEdit?._id,
      content: message.message,
    };
    editmutation.mutateAsync(messageData as any);
    cancelEdit();
  };

  //replyHandler
  const onReplySubmit = () => {
    if (!selectedChat?.chatId && !isReply) {
      return;
    }
    const messageData = {
      chatId: selectedChat?.chatId,
      messageId: isReply?._id,
      content: message.message,
    };
    replymutation.mutateAsync(messageData as any);
    cancelReply();
  };
  //emoji click
  const onEmojiClick = (e: Temoji) => {
    setMessage((prev) => ({ ...prev, message: prev.message + e.emoji }));
  };
  //side effects and change status
  useEffect(() => {
    if (isEdit) {
      setMessage({ message: isEdit.content });
    }
  }, [isEdit]);

  if (selectedChat?.status === "blocked") {
    return <ChatStatus user={selectedChat.chatUpdatedBy} />;
  }
  return (
    <>
      {isTyping && typingContent && typingChatId === selectedChat?.chatId && (
        <TypingIndicatot user={selectedChat} />
      )}
      <div className="max-w-fit mx-auto">
        {isEdit && (
          <div className="p-4 bg-gray-900 text-white m-y rounded">
            <div className="flexBetween">
              <div>
                Edit
                <span className="font-bold mx-2">
                  {isEdit.sender._id === currentUser?._id
                    ? "Own Message"
                    : isEdit.sender.username}
                </span>
              </div>
              <IoMdClose
                onClick={() => cancelEdit()}
                className="h-6 w-6 cursor-pointer"
              />
            </div>
          </div>
        )}
        {isReply && (
          <div className="p-4 bg-gray-900 text-white m-y rounded">
            <div className="flexBetween">
              <div>
                {" "}
                reply to{" "}
                <span className="font-bold mx-2">
                  {isReply.sender._id === currentUser?._id
                    ? "Myself"
                    : isReply.sender.username}
                </span>
              </div>
              <IoMdClose
                onClick={() => cancelReply()}
                className="h-6 w-6 cursor-pointer"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center w-full">
          <span className="p-2">
            <button className="rounded-md" onClick={() => setOpenEmoji((prev) => !prev)}>
              <MdOutlineKeyboardVoice className="text-blue-400 h-8 w-8 mx-1" />
            </button>
            <button className="rounded-md" onClick={() => setOpenEmoji((prev) => !prev)}>
              <MdAddAPhoto className="text-blue-400 h-8 w-8 mx-1" />
            </button>
            <button className="rounded-md" onClick={() => setOpenEmoji((prev) => !prev)}>
              <IoMdPhotos className="text-blue-400 h-8 w-8 " />
            </button>
            <button className="rounded-md" onClick={() => setOpenEmoji((prev) => !prev)}>
              <RiEmojiStickerLine className="text-blue-400 h-8 w-8 mx-1" />
            </button>
          </span>
          <div className="relative">
            <textarea
              className="px-2 py-3 rounded-xl pr-12 text-sm md:text-xl max-h-[200px] overflow-y-auto border-2 border-violet-800 hover:border-green-500 transition-all duration-300 outline-none   w-full text-black"
              name="message"
              placeholder="Aa"
              value={message.message}
              onChange={(e) => handleChange(e)}
              onKeyDown={onkeydown}
              rows={2}
            />
            <div ref={clickRef} className="absolute right-2 bottom-4 text-2xl">
              <button
                className="rounded-md mr-1"
                onClick={() => setOpenEmoji((prev) => !prev)}
              >
                🙂
              </button>
              <EmojiPicker
                open={openEmoji}
                style={{
                  position: "absolute",
                  top: "-470px", // Adjust this value based on your design
                  right: "0",
                  zIndex: 1000,
                }}
                onEmojiClick={onEmojiClick}
                autoFocusSearch
                theme={Theme.DARK}
                lazyLoadEmojis
                emojiStyle={EmojiStyle.FACEBOOK}
                searchPlaceholder="Search chat emojis..."
                suggestedEmojisMode={SuggestionMode.RECENT}
              />
            </div>
          </div>
          <button
            onClick={isEdit ? onEditSubmit : isReply ? onReplySubmit : onSubmit}
            className="h-auto text-xl md:text-2xl mx-2"
          >
            {isEdit ? (
              <span className="btn capitalize text-xs h-full">Edit</span>
            ) : isReply ? (
              <span className="btn capitalize text-xs h-full">Reply</span>
            ) : (
              "😍"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Input;
