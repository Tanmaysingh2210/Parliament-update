import React from 'react';
import './chatSystem.css';
import { useState, useEffect, useRef } from 'react';

//child of gameChatContainer

export default function GameChat({ messages = [], addMessage, players, toast }) {

    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Scroll to bottom when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);



    // Handle send message
    const handleSendMessage = () => {
        if (inputMessage.trim() === '') return;
        console.log("Send button clicked");   // ADD
        console.log("Calling prop:", addMessage);
        addMessage(
            "You", inputMessage, "user"
        );
        setInputMessage('');
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <>
            {toast && (
                <div className={`wall-toast ${toast.type}`}>
                    <span className="toast-icon">
                        {toast.type === "success" ? "✅" : "❌"}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                </div>
            )}
            <div className="chat-container">
                <div className="chat-header">
                    <div className="chat-title">GAME CHAT</div>
                    <div className="chat-status">
                        <span className="status-dot"></span>
                        <span>{players.length || 0} Players</span>
                    </div>
                </div>
                <div className="chat-messages">
                    {messages.map((message, index) => (
                        <div key={`${message.id}-${index}`} className={`message ${message.type}`}>
                            <div className="message-sender">{message.sender}</div>
                            <div className="message-content">{message.content}</div>
                            <div className="message-time">{message.time}</div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Type your message..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={handleSendMessage}
                        disabled={inputMessage.trim() === ''}
                    >
                        Send
                    </button>
                </div>
            </div>

        </>

    );
}