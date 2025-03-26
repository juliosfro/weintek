mouseArea.on('click', (mouseEvent) => {
    console.log("Motor clicado...");
        
    const motor = {
        tag: "BBA 00.01",
        nome: "Bomba de vacuo de pata A",
        setPoint: "50",
        corrente: "2.8",
        velocidade_atual: "1680",
        frequencia: "50",
        ligar: 0,
        desligar: 1,
        status_ligado: 0,
        reset: 1,
        status_falha: 0,
        in_sts: 0,
        ready: 0,
        intert: 0,
        falha: 0,
        emerg: 0,
        fcurs: 0,
        rev: 0,
        rem: 0,
        man_aut: 0,
        comm: 1,
    };
    
    // Os dados devem ser atribuidos no formato de string
    const motorString = JSON.stringify(motor);

    // A atribuicao se da por meio de chave e valor, a chave serve para recuperar o objeto
    window.memoryStorage.setItem("motor", motorString);

    // Ao recuperar o objeto deve-se fazer o parse para objeto javascript
    const motorParsedObject = JSON.parse(window.memoryStorage.getItem("motor"));

    console.log(motorParsedObject.tag);
    console.log(motorParsedObject.nome);
    
    // Limpa todos os dados contidos no storage, esse metodo pode ser chamado ao fechar uma janela
    window.memoryStorage.clear();
});