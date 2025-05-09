import { useState, useRef, useEffect, memo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const Message = memo(({ content, type, reasoning, error, onRetry }) => {
  return (
    <div
      className={`flex ${
        type === 'user' ? 'justify-end' : 'justify-start'
      } mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          type === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800 shadow-sm border border-gray-100'
        }`}
      >
        {reasoning && (
          <div className="mb-2 text-xs text-left opacity-80">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        )}
        <div className="text-sm leading-relaxed text-left">
          {error ? (
            <div className="flex flex-col items-start gap-2">
              <span className="text-red-500">{content}</span>
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                重试
              </button>
            </div>
          ) : (
            <ReactMarkdown>{content}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
});

const StreamingMessage = memo(({ content, reasoning }) => {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-lg p-3 bg-white text-gray-800 shadow-sm border border-gray-100">
        {reasoning && (
          <div className="mb-2 text-xs text-left opacity-80">
            <ReactMarkdown>{reasoning}</ReactMarkdown>
          </div>
        )}
        <div className="text-sm leading-relaxed text-left">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

const ThinkingIndicator = memo(() => {
  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[85%] rounded-lg p-3 bg-white text-gray-800 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          <span className="text-gray-400 ml-2 text-xs">思考中...</span>
        </div>
      </div>
    </div>
  );
});

const MessageList = memo(({ messages, streamingMessage, streamingReasoning, onRetry }) => {
  const renderKey = useCallback((msg, index) => {
    return `${msg.type}-${index}-${msg.content.substring(0, 20)}`;
  }, []);

  return (
    <>
      {messages.map((msg, index) => (
        <Message
          key={renderKey(msg, index)}
          type={msg.type}
          content={msg.content}
          reasoning={msg.reasoning}
          error={msg.error}
          onRetry={() => onRetry(msg.retryContent)}
        />
      ))}
      {!streamingMessage && messages.length > 0 && messages[messages.length - 1].type === 'user' && (
        <ThinkingIndicator />
      )}
      {streamingMessage && (
        <StreamingMessage 
          content={streamingMessage}
          reasoning={streamingReasoning}
        />
      )}
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.messages === nextProps.messages &&
    prevProps.streamingMessage === nextProps.streamingMessage &&
    prevProps.streamingReasoning === nextProps.streamingReasoning
  );
});

export default function ChatPanel({ onSendMessage, messages, streamingMessage, streamingReasoning }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const scrollTimeoutRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        const messageList = messageListRef.current;
        const isNearBottom = messageList && 
          messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 100;
        
        messagesEndRef.current.scrollIntoView({
          behavior: isNearBottom ? 'smooth' : 'auto',
          block: 'end',
        });
      }
    }, 50);
  }, []);

  useEffect(() => {
    const hasNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (hasNewMessage || streamingMessage) {
      scrollToBottom();
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, streamingMessage, scrollToBottom]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  }, [input, onSendMessage]);

  const handleRetry = useCallback((retryContent) => {
    if (retryContent) {
      onSendMessage(retryContent);
    }
  }, [onSendMessage]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div 
        ref={messageListRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <MessageList 
          messages={messages}
          streamingMessage={streamingMessage}
          streamingReasoning={streamingReasoning}
          onRetry={handleRetry}
        />
        <div ref={messagesEndRef} className="h-0" />
      </div>
      <div className="p-3 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 text-sm border rounded-lg px-3 py-2 bg-gray-50 text-gray-800 border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入消息..."
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
}