class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            openButtonChat: document.querySelector('.close-button'),
            chatBox: document.querySelector('.chatbox__support'),
            sendButton: document.querySelector('.send__button'),
            messageInput: document.querySelector('.chatbox__footer input'),
            chatMessages: document.querySelector('.chatbox__messages'),

        };

        this.state = false;
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.sessionId = Math.random().toString(36).substring(2, 9);
        this.setupSocket();

        this.messages = [
            { name: "Bot", message: "Olá, seja bem-vindo à Clínica Mais Saúde! 😊\n\nSou o Dr. Bot 👨‍⚕️, seu assistente virtual para agendamentos e informações sobre nossos serviços.", type: "text", buttons: [] } // Mensagem inicial
        ];

        this.messageQueue = [];
        this.isProcessingQueue = false;
    }
    activatePhoneMask() {
        const phoneInput = this.args.messageInput;
        
        const formatPhone = function(e) {
            let value = e.target.value.replace(/\D/g, ''); 

            if (value.length > 11) {
                value = value.slice(0, 11);
            }

            if (value.length > 6) {
                value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
            } else if (value.length > 2) {
                value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
            } else if (value.length > 0) {
                value = `(${value}`;
            }

            e.target.value = value; 
        };

        // Adiciona o listener de formatação
        phoneInput.addEventListener('input', formatPhone);

        this.removePhoneMask = () => {
            phoneInput.removeEventListener('input', formatPhone); 
        };
    }

    setupSocket() {
        this.socket = io.connect('http://localhost:5005', { path: '/socket.io/' });
    
        this.socket.on('connect', () => {
            console.log('Connected to the chat server!');
            this.socket.emit('session_request', { session_id: this.sessionId });
        });
    
        this.socket.on('bot_uttered', (message) => {
            const processedMessage = this.processBotMessage(message);
            if (processedMessage) {
                this.messageQueue.push(processedMessage);
                this.processQueue();
            }
            if (
                message.text &&
                (message.text.includes("Qual dia e horário ficam melhores pra você? Se quiser, pode perguntar os próximos horários disponíveis, ou você escolhe um mês ou dia específico") || 
                 message.text.includes("Para qual data você gostaria de remarcar?")
                )
            ) {
                this.showCalendar();
            }
            // Quando o bot pedir o telefone
            if (message.text && message.text.includes("Por fim, informe seu telefone celular")) {
                const input = this.args.messageInput;
                input.setAttribute('type', 'tel'); // Mudar para campo de telefone
                input.placeholder = "(00) 00000-0000"; // Adicionar o placeholder
                this.activatePhoneMask(); // Ativar a máscara
            }
        });
    
        this.socket.on('connect_error', (error) => {
            console.error('Error connecting to the chat server:', error);
        });
    }




    processQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) return;

        this.isProcessingQueue = true;
        const message = this.messageQueue.shift();

        this.showTypingIndicator();

        setTimeout(() => {
            this.hideTypingIndicator();
            this.addMessage("Bot", message.text, message.type, message.buttons);
            this.isProcessingQueue = false;
            this.processQueue();
        }, 1500);
    }
    addDateDivider() {
        const chatMessagesContainer = this.args.chatMessages;
        const dateDivider = document.createElement('div');
        dateDivider.className = 'chatbox__date-divider';

        const dateText = document.createElement('span');
        dateText.innerText = this.getFormattedDate();
        dateText.className = 'chatbox__date-text';
        dateDivider.appendChild(dateText);
        chatMessagesContainer.appendChild(dateDivider);
    }

    getFormattedDate() {
        const daysOfWeek = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        const monthsOfYear = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        
        const today = new Date();
        const dayName = daysOfWeek[today.getDay()];
        const day = today.getDate();
        const monthName = monthsOfYear[today.getMonth()];

        return `${dayName}, ${day} de ${monthName}`;
    }
    display() {
        const {openButtonChat, openButton, chatBox, sendButton, messageInput } = this.args;
        openButton.addEventListener('click', () => this.toggleState(chatBox));
        openButtonChat.addEventListener('click', () => this.toggleState(chatBox));
        sendButton.addEventListener('click', () => this.sendMessage(messageInput.value));
        messageInput.addEventListener('keyup', ({ key }) => {
            if (key === 'Enter') {
                this.sendMessage(messageInput.value);
            }
        });
        this.addDateDivider(); // Adiciona a data como uma div no início da conversa

        this.updateChatText();

        this.addInitialButton();
        this.initializeCalendar();
    }
    
    initializeCalendar() {
        flatpickr("#calendar", {
            inline: true,
            dateFormat: "d-m-Y",
            minDate: "today",

            disable: [
                function (date) {
                    return (date.getDay() === 0 || date.getDay() === 6);
                }
            ],

            locale: {
                firstDayOfWeek: 1,
                weekdays: {
                    shorthand: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"],
                    longhand: [
                        "Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sabado"
                    ]
                },
                months: {
                    shorthand: [
                        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"
                    ],
                    longhand: [
                        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
                    ]
                }
            },
            onChange: this.handleDateSelect.bind(this),
            monthSelectorType: "static",
            showMonths: 1,
            nextArrow: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>',
            prevArrow: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path d="M16 5v14l-11-7z"></path></svg>'
        });

        const backButton = document.getElementById('back-button');
        const closeButton = document.getElementById('button_close');

        backButton.addEventListener('click', this.showCalendar.bind(this));
        closeButton.addEventListener('click', this.closeCalendar.bind(this));

    }
    showCalendar() {
        const calendarContainer = document.getElementById('calendar-container');
        const timeSlotsContainer = document.getElementById('time-slots-container');
        const chatboxMessages = document.querySelector('.chatbox__messages');

        calendarContainer.style.display = 'flex';
        timeSlotsContainer.style.display = 'none';

        setTimeout(() => {
            calendarContainer.style.transform = 'translateY(0)'; 
        }, 10); 

        chatboxMessages.style.opacity = '0.1';
        }

    closeCalendar() {
        const chatboxMessages = document.querySelector('.chatbox__messages');
        const calendarContainer = document.getElementById('calendar-container');
        const timeSlotsContainer = document.getElementById('time-slots-container');
        calendarContainer.style.display = 'none';
        timeSlotsContainer.style.display = 'none';

        chatboxMessages.style.opacity = '1';

    }
    hideCalendar() {
        const calendarContainer = document.getElementById('calendar-container');
        const chatboxMessages = document.querySelector('.chatbox__messages');
    
        calendarContainer.style.transform = 'translateY(100%)';
    
        chatboxMessages.style.opacity = '1';
    
        setTimeout(() => {
            calendarContainer.style.display = 'none';
        }, 500); 
    }

    async handleDateSelect(selectedDates) {
        const selectedDate = selectedDates[0];
        if (selectedDate) {
            const timeSlots = await this.getTimeSlots(selectedDate);
            this.displayTimeSlots(timeSlots);
        }
    }

    async getTimeSlots(selectedDate) {
        const slots = {};

        for (let i = 0; i < 3; i++) {
            const date = new Date(selectedDate);
            date.setDate(date.getDate() + i);
            const dateString = date.toDateString();

            // Obtém os horários livres para o dia específico
            const freeSlots = await this.getNextFreeTimeSlotsForDate(date);

            slots[dateString] = freeSlots.length > 0 ? freeSlots : ["No slots available"];
        }

        return slots;
    }

    async getNextFreeTimeSlotsForDate(date, maxSlots = 5) {
        const startOfDay = new Date(date);
        startOfDay.setHours(7, 0, 0, 0); 

        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(18, 0, 0, 0);  

        try {
            const response = await fetch(`http://localhost:3010/eventos?dataInicial=${startOfDay.toISOString()}&dataFinal=${endOfDay.toISOString()}`);
            if (!response.ok) {
                throw new Error('Nenhum horário disponivel');
            }
            const eventsResult = await response.json();
            const events = eventsResult.eventos || [];

            const freeSlots = [];
            let currentTime = new Date(startOfDay);

            while (freeSlots.length < maxSlots && currentTime < endOfDay) { 
                let isFree = events.every(event => {
                    let startEvent = new Date(event.dataInicial);
                    let endEvent = new Date(event.dataFinal);

                    return currentTime < startEvent || currentTime >= endEvent;
                });

                if (isFree) {
                    freeSlots.push(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); 
                }

                currentTime.setHours(currentTime.getHours() + 1); 
            }

            return freeSlots;

        } catch (error) {
            console.error("Erro ao buscar dias:", error);
            return ["Error fetching slots"];
        }
    }

    displayTimeSlots(timeSlots) {
        const calendarContainer = document.getElementById('calendar-container');
        const timeSlotsContainer = document.getElementById('time-slots-container');
        const timeSlotsDiv = document.getElementById('time-slots');
        timeSlotsDiv.innerHTML = '';

        function capitalizeFirstLetter(string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        }

        for (const [date, slots] of Object.entries(timeSlots)) {
            const formattedDate = new Date(date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const parts = formattedDate.split(' ');
            parts[0] = capitalizeFirstLetter(parts[0]);
            parts[3] = capitalizeFirstLetter(parts[3]);
            const capitalizedDate = parts.join(' ');

            const header = document.createElement('div');
            header.className = 'time-slots-header';
            header.innerText = capitalizedDate;
            timeSlotsDiv.appendChild(header);

            if (slots.length === 0) {
                const noSlots = document.createElement('div');
                noSlots.innerText = 'Nenhum horário disponível para este dia';
                timeSlotsDiv.appendChild(noSlots);
            } else {
                slots.forEach(slotTime => {
                    const button = document.createElement('button');
                    button.innerText = slotTime;
                    button.className = "button_select_date";
                    button.setAttribute('data-date', capitalizedDate); // Adiciona a data ao botão
                    button.addEventListener('click', () => this.handleTimeSlotSelect(button));
                    timeSlotsDiv.appendChild(button);
                });
            }

            const separator = document.createElement('hr');
            separator.className = "hr_line";
            timeSlotsDiv.appendChild(separator);
        }

        calendarContainer.style.display = 'none';
        timeSlotsContainer.style.display = 'block';
    }

    handleTimeSlotSelect(button) {
        const date = button.getAttribute('data-date'); 
        const time = button.innerText;
        this.sendMessage(`${date} às ${time}`);
        this.closeCalendar()
    }

   

    toggleState(chatbox) {
        this.state = !this.state;
        if (this.state) {
            chatbox.classList.add('chatbox--active');
        } else {
            chatbox.classList.remove('chatbox--active');
        }
    }
   
    
    sendMessageToRasa(intent) {
        this.socket.emit('user_uttered', { 
            message: intent, 
            session_id: this.sessionId,
        });
    }

    sendMessage(text) {
        const phoneInput = this.args.messageInput;

        if (phoneInput && phoneInput.value.trim() !== '') {
            // Enviar o número formatado
            this.addMessage('User', phoneInput.value); 
            this.sendMessageToRasa(phoneInput.value);

            // Após o envio, limpar o campo e remover a máscara
            phoneInput.value = ''; // Limpar o valor
            phoneInput.setAttribute('type', 'text'); // Voltar para campo de texto
            phoneInput.placeholder = "Digite sua mensagem..."; // Resetar o placeholder
            this.removePhoneMask(); // Remover o evento de formatação
        } else if (text.trim() !== '') {
            // Enviar mensagem normal
            this.addMessage('User', text);
            this.sendMessageToRasa(text);
        }

        this.args.messageInput.value = ''; // Limpar campo de mensagem
    }

    addMessage(sender, message, type = 'text', buttons = []) {
        let msg = { name: sender, message, type, buttons };
        this.messages.push(msg);
        this.updateChatText();
    }

    handleButtonClick(intent, buttonElement) {
        console.log("Clicou no botão, estado disabled:", buttonElement.disabled);

        if (buttonElement.disabled) {
            console.log("Botão já está desabilitado.");
            return;
        }

        console.log("Enviando intenção e desabilitando o botão:", intent);
        this.sendMessageToRasa(intent);
        buttonElement.disabled = true;

        if (buttonElement.disabled) {
            console.log("Botão agora está desabilitado.");
            console.log("Clicou no botão, estado disabled:", buttonElement.disabled);
        }
    }

    updateChatText() {
        const chatMessage = this.args.chatMessages;
        
        // Verifica se já existe um elemento de data no container
        const dateDivider = document.querySelector('.chatbox__date-divider');
        chatMessage.innerHTML = dateDivider ? dateDivider.outerHTML : '';
    
        this.messages.forEach((item) => {
            if (item.type === 'text') {
                const messageContainer = document.createElement('div');
                messageContainer.className = `messages__container messages__container--${item.name === "Bot" ? "operator" : "visitor"}`;
    
                if (item.name === "Bot") {
                    const image = document.createElement('img');
                    image.src = './images/logo.png';
                    image.className = 'logo_image';
                    messageContainer.appendChild(image);
                }
    
                const messageDiv = document.createElement('div');
                messageDiv.className = `messages__item messages__item--${item.name === "Bot" ? "operator" : "visitor"}`;
                messageDiv.innerText = item.message;
                messageContainer.appendChild(messageDiv);
    
                chatMessage.appendChild(messageContainer);
            } else if (item.type === 'buttons') {
                const messageContainer = document.createElement('div');
                messageContainer.className = 'messages__container messages__container--operator';
    
                const image = document.createElement('img');
                image.src = './images/logo.png';
                image.className = 'logo_image';
                messageContainer.appendChild(image);
    
                const titleDiv = document.createElement('div');
                titleDiv.className = 'messages__item messages__item--operator';
                titleDiv.innerText = item.message;
                messageContainer.appendChild(titleDiv);
    
                chatMessage.appendChild(messageContainer);
    
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'chat-buttons';
                item.buttons.forEach((button) => {
                    const buttonElement = document.createElement('button');
                    buttonElement.className = "chat-button";
                    buttonElement.innerText = button.title;
                    buttonElement.addEventListener('click', (e) => {
                        this.handleButtonClick(button.payload, e.target);
                    });
                    buttonsContainer.appendChild(buttonElement);
                });
                chatMessage.appendChild(buttonsContainer);
            }
        });
    
        chatMessage.scrollTop = chatMessage.scrollHeight;
    }

    addInitialButton() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'messages__container messages__container--visitor';

        const button = document.createElement('button');
        button.className = 'chat-button-start';
        button.innerText = 'Oi';
        button.addEventListener('click', () => this.sendMessage('Oi'));

        const blinkingDot = document.createElement('div');
        blinkingDot.className = 'blinking-dot';
        button.appendChild(blinkingDot);

        buttonContainer.appendChild(button);
        this.args.chatMessages.appendChild(buttonContainer);
    }

    processBotMessage(message) {
        const processedMessage = {
            text: message.text || '',
            type: message.quick_replies ? 'buttons' : 'text',
            buttons: message.quick_replies ? message.quick_replies.map(reply => ({
                title: reply.title,
                payload: reply.payload
            })) : []
        };
        return processedMessage;
    }

    closeChatbox() {
        document.querySelector('.chatbox').classList.remove('chatbox--active');
    }

    showTypingIndicator() {
        const chatMessage = this.args.chatMessages;
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'messages__container messages__container--operator';
        typingIndicator.id = 'typingIndicator';

        const image = document.createElement('img');
        image.src = './images/logo.png';
        image.className = 'logo_image';
        typingIndicator.appendChild(image);

        const typingText = document.createElement('div');
        typingText.className = 'typing';
        typingText.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        typingIndicator.appendChild(typingText);

        chatMessage.appendChild(typingIndicator);
        chatMessage.scrollTop = chatMessage.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}

const chatbox = new Chatbox();
chatbox.display();
