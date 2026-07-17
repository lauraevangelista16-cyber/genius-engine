const Debugger = require('../core/Debugger');

function normalizarTexto(valor = '') {
    return String(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function normalizarTelefone(valor = '') {
    let telefone = String(valor)
        .replace('@s.whatsapp.net', '')
        .replace(/\D/g, '');

    if (telefone.startsWith('55') && telefone.length > 11) {
        telefone = telefone.slice(2);
    }

    return telefone;
}

function telefoneCompativel(telefoneEsperado, textoOpcao) {
    const esperado = normalizarTelefone(telefoneEsperado);
    const encontrado = normalizarTelefone(textoOpcao);

    if (!esperado || !encontrado) {
        return false;
    }

    return (
        encontrado.includes(esperado) ||
        encontrado.includes(esperado.slice(-8)) ||
        esperado.includes(encontrado.slice(-8))
    );
}

async function obterTextoElemento(elemento) {
    const innerText = await elemento
        .innerText()
        .catch(() => '');

    if (innerText && innerText.trim()) {
        return innerText.trim();
    }

    const textContent = await elemento
        .textContent()
        .catch(() => '');

    if (textContent && textContent.trim()) {
        return textContent.trim();
    }

    const ariaLabel = await elemento
        .getAttribute('aria-label')
        .catch(() => '');

    if (ariaLabel && ariaLabel.trim()) {
        return ariaLabel.trim();
    }

    const title = await elemento
        .getAttribute('title')
        .catch(() => '');

    return String(title || '').trim();
}

async function clicarBotaoAdicionarCliente(page) {
    const candidatos = [
        page.getByRole('button', {
            name: /adicionar cliente/i
        }),
        page.getByRole('button', {
            name: /novo cliente/i
        }),
        page.getByRole('button', {
            name: /cadastrar cliente/i
        }),
        page.getByText('ADICIONAR CLIENTE', {
            exact: false
        }),
        page.getByText('Adicionar cliente', {
            exact: false
        }),
        page.getByText('Novo cliente', {
            exact: false
        }),
        page.getByText('Cadastrar cliente', {
            exact: false
        }),
        page.locator('button').filter({
            hasText: /adicionar.*cliente/i
        }),
        page.locator('button').filter({
            hasText: /novo.*cliente/i
        })
    ];

    for (const candidato of candidatos) {
        const total = await candidato
            .count()
            .catch(() => 0);

        if (!total) {
            continue;
        }

        for (let i = 0; i < total; i++) {
            const botao = candidato.nth(i);

            const visivel = await botao
                .isVisible()
                .catch(() => false);

            if (!visivel) {
                continue;
            }

            await botao.click({
                force: true,
                timeout: 10000
            });

            return true;
        }
    }

    return false;
}

async function obterCampoClienteAtendimento(page) {
    const candidatos = [
        page.locator('#downshift-0-input'),
        page.locator('input[id^="downshift-"][id$="-input"]'),
        page.getByRole('textbox', {
            name: /cliente/i
        }),
        page.locator('input[placeholder*="Cliente" i]'),
        page.locator('input[name*="cliente" i]'),
        page.locator('input[aria-label*="Cliente" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato
            .count()
            .catch(() => 0);

        if (!total) {
            continue;
        }

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);

            const visivel = await campo
                .isVisible()
                .catch(() => false);

            if (visivel) {
                return campo;
            }
        }
    }

    return null;
}

async function obterContextoCampoCliente(campoCliente) {
    const textos = [];

    const valor = await campoCliente
        .inputValue()
        .catch(() => '');

    if (valor) {
        textos.push(valor);
    }

    const ariaLabel = await campoCliente
        .getAttribute('aria-label')
        .catch(() => '');

    if (ariaLabel) {
        textos.push(ariaLabel);
    }

    const title = await campoCliente
        .getAttribute('title')
        .catch(() => '');

    if (title) {
        textos.push(title);
    }

    const container = campoCliente.locator(
        'xpath=ancestor::*[' +
        'self::div or self::label or self::section' +
        '][position() <= 4]'
    ).last();

    const existeContainer = await container
        .count()
        .catch(() => 0);

    if (existeContainer) {
        const textoContainer = await container
            .textContent()
            .catch(() => '');

        if (textoContainer) {
            textos.push(textoContainer);
        }
    }

    return textos
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function clienteEstaSelecionado(
    campoCliente,
    cliente,
    telefone
) {
    const clienteNormalizado = normalizarTexto(cliente);
    const telefoneNormalizado = normalizarTelefone(telefone);

    const contexto = await obterContextoCampoCliente(
        campoCliente
    );

    const contextoNormalizado = normalizarTexto(contexto);
    const numerosContexto = normalizarTelefone(contexto);

    const nomeOk =
        Boolean(clienteNormalizado) &&
        contextoNormalizado.includes(clienteNormalizado);

    const telefoneOk =
        !telefoneNormalizado ||
        numerosContexto.includes(telefoneNormalizado) ||
        numerosContexto.includes(
            telefoneNormalizado.slice(-8)
        );

    await Debugger.step(
        campoCliente.page(),
        `C010-contexto-cliente-${contexto || 'vazio'}`
    );

    /*
     * Quando há telefone, nome e telefone precisam coincidir.
     * Isso evita selecionar outra pessoa com o mesmo nome.
     */
    if (telefoneNormalizado) {
        return nomeOk && telefoneOk;
    }

    return nomeOk;
}

async function obterOpcoesAutocomplete(page) {
    const seletores = [
        '[role="listbox"] [role="option"]',
        '[role="option"]',
        '.MuiAutocomplete-popper [role="option"]',
        '.MuiAutocomplete-option',
        '[id^="downshift-"][id*="-item-"]',
        '[id^="downshift-"][id*="-menu"] > *'
    ];

    const opcoesEncontradas = [];

    for (const seletor of seletores) {
        const elementos = page.locator(seletor);

        const total = await elementos
            .count()
            .catch(() => 0);

        for (let i = 0; i < total; i++) {
            const elemento = elementos.nth(i);

            const visivel = await elemento
                .isVisible()
                .catch(() => false);

            if (!visivel) {
                continue;
            }

            const texto = await obterTextoElemento(
                elemento
            );

            if (!texto) {
                continue;
            }

            opcoesEncontradas.push({
                elemento,
                texto
            });
        }

        if (opcoesEncontradas.length) {
            break;
        }
    }

    return opcoesEncontradas;
}

async function garantirClienteNoAtendimento(
    page,
    cliente,
    telefone
) {
    await page.waitForTimeout(1500);

    const campoCliente =
        await obterCampoClienteAtendimento(page);

    if (!campoCliente) {
        await Debugger.step(
            page,
            'C010-campo-cliente-atendimento-nao-encontrado'
        );

        return false;
    }

    const clienteNormalizado = normalizarTexto(cliente);
    const telefoneNormalizado =
        normalizarTelefone(telefone);

    if (
        await clienteEstaSelecionado(
            campoCliente,
            cliente,
            telefone
        )
    ) {
        await Debugger.step(
            page,
            'C010-cliente-ja-estava-selecionado'
        );

        return true;
    }

    async function digitarClienteEForcarAutocomplete(
        tentativa
    ) {
        await campoCliente.click({
            force: true,
            timeout: 10000
        });

        await campoCliente.fill('');

        await page.waitForTimeout(300);

        await campoCliente.type(cliente, {
            delay: 80
        });

        await Debugger.step(
            page,
            `C010-cliente-digitado-apos-criacao-tentativa-${tentativa}`
        );

        await page.waitForTimeout(1200);

        /*
         * Força o Downshift/MUI a recalcular a busca.
         */
        await campoCliente.press('End').catch(() => {});
        await campoCliente.type(' ', {
            delay: 50
        }).catch(() => {});

        await page.waitForTimeout(300);

        await campoCliente
            .press('Backspace')
            .catch(() => {});

        await page.waitForTimeout(1500);

        await Debugger.step(
            page,
            `C010-autocomplete-forcado-tentativa-${tentativa}`
        );
    }

    async function selecionarOpcaoCliente(tentativa) {
        await page.waitForSelector(
            '[role="option"], ' +
            '.MuiAutocomplete-option, ' +
            '[id^="downshift-"][id*="-item-"]',
            {
                timeout: 5000
            }
        ).catch(() => {});

        const opcoes = await obterOpcoesAutocomplete(page);

        await Debugger.step(
            page,
            `C010-opcoes-validas-apos-criacao-${opcoes.length}-tentativa-${tentativa}`
        );

        let opcaoPorTelefone = null;
        let opcaoPorNome = null;

        for (let i = 0; i < opcoes.length; i++) {
            const { elemento, texto } = opcoes[i];

            const textoNormalizado =
                normalizarTexto(texto);

            const nomeOk =
                Boolean(clienteNormalizado) &&
                textoNormalizado.includes(
                    clienteNormalizado
                );

            const telefoneOk =
                Boolean(telefoneNormalizado) &&
                telefoneCompativel(
                    telefoneNormalizado,
                    texto
                );

            await Debugger.step(
                page,
                `C010-opcao-cliente-${i}-nome-${nomeOk}-telefone-${telefoneOk}-${texto.replace(/\s+/g, ' ').slice(0, 120)}`
            );

            /*
             * Quando foi informado telefone, a opção só pode
             * ser selecionada se nome e telefone coincidirem.
             */
            if (
                telefoneNormalizado &&
                nomeOk &&
                telefoneOk
            ) {
                opcaoPorTelefone = elemento;
                break;
            }

            /*
             * Nome sozinho só é permitido quando não há telefone.
             */
            if (
                !telefoneNormalizado &&
                nomeOk &&
                !opcaoPorNome
            ) {
                opcaoPorNome = elemento;
            }
        }

        const opcaoEscolhida =
            opcaoPorTelefone || opcaoPorNome;

        if (!opcaoEscolhida) {
            await Debugger.step(
                page,
                `C010-nenhuma-opcao-compativel-tentativa-${tentativa}`
            );

            return false;
        }

        await opcaoEscolhida.scrollIntoViewIfNeeded()
            .catch(() => {});

  await opcaoEscolhida.click({
    force: true,
    timeout: 10000
});

await page.waitForTimeout(800);
/*
 * Alguns componentes (Downshift/MUI)
 * só confirmam a seleção quando o
 * campo perde o foco.
 */
await campoCliente.press('Tab').catch(() => {});

await page.waitForTimeout(800);
const valorCampoAposClique = await campoCliente
  .inputValue()
  .catch(() => '');

console.log(
  '[garantirClienteNoAtendimento] valor após selecionar:',
  valorCampoAposClique
);
await Debugger.step(
    page,
    'C010-cliente-selecionado-no-autocomplete'
);

return true;
    }

    for (
        let tentativa = 1;
        tentativa <= 4;
        tentativa++
    ) {
        await digitarClienteEForcarAutocomplete(
            tentativa
        );

        const selecionou =
            await selecionarOpcaoCliente(tentativa);

        if (!selecionou) {
            continue;
        }

        const confirmado =
            await clienteEstaSelecionado(
                campoCliente,
                cliente,
                telefone
            );

        if (confirmado) {
            await Debugger.step(
                page,
                `C010-cliente-confirmado-apos-selecao-tentativa-${tentativa}`
            );

            return true;
        }

        await Debugger.step(
            page,
            `C010-cliente-nao-confirmado-apos-clique-tentativa-${tentativa}`
        );
    }

    await Debugger.step(
        page,
        'C010-cliente-nao-encontrado-com-nome-e-telefone'
    );

    return false;
}

function converterDataParaBR(dataISO) {
    if (!dataISO) {
        return '';
    }

    const partes = String(dataISO).split('-');

    if (partes.length !== 3) {
        return String(dataISO);
    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;
}

async function obterCampoDataAtendimento(page) {
    const candidatos = [
        page.locator('input[name="date"]'),
        page.locator('input[name="data"]'),
        page.locator('input[placeholder*="Data" i]'),
        page.locator('input[aria-label*="Data" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato
            .count()
            .catch(() => 0);

        if (!total) {
            continue;
        }

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);

            const visivel = await campo
                .isVisible()
                .catch(() => false);

            if (visivel) {
                return campo;
            }
        }
    }

    return null;
}

async function obterCampoHoraAtendimento(page) {
    const candidatos = [
        page.locator('input[name="startTime"]'),
        page.locator('input[name="horaInicio"]'),
        page.locator('input[placeholder*="Hora" i]'),
        page.locator('input[aria-label*="Hora" i]')
    ];

    for (const candidato of candidatos) {
        const total = await candidato
            .count()
            .catch(() => 0);

        if (!total) {
            continue;
        }

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);

            const visivel = await campo
                .isVisible()
                .catch(() => false);

            if (visivel) {
                return campo;
            }
        }
    }

    return null;
}

async function garantirDataHoraNoAtendimento(
    page,
    data,
    horario
) {
    await page.waitForTimeout(500);

    const campoData =
        await obterCampoDataAtendimento(page);

    const campoHora =
        await obterCampoHoraAtendimento(page);

    const valorDataAtual = campoData
        ? await campoData.inputValue().catch(() => '')
        : '';

    const valorHoraAtual = campoHora
        ? await campoHora.inputValue().catch(() => '')
        : '';

    await Debugger.step(
        page,
        `C010B-data-hora-apos-salvar-cliente-data-${valorDataAtual || 'vazio'}-hora-${valorHoraAtual || 'vazio'}`
    );

    let dataOk = Boolean(
        valorDataAtual &&
        valorDataAtual.trim()
    );

    let horaOk = Boolean(
        valorHoraAtual &&
        valorHoraAtual.trim()
    );

    if (!dataOk && campoData && data) {
        const dataBR = converterDataParaBR(data);

        await campoData.click({
            force: true,
            timeout: 10000
        });

        await campoData.fill('');
        await campoData.fill(dataBR);

        await page.waitForTimeout(500);

        const dataDepois = await campoData
            .inputValue()
            .catch(() => '');

        await Debugger.step(
            page,
            `C010B-data-repreenchida-${dataDepois || 'vazio'}`
        );

        dataOk = Boolean(
            dataDepois &&
            dataDepois.trim()
        );
    }

    if (!horaOk && campoHora && horario) {
        await campoHora.click({
            force: true,
            timeout: 10000
        });

        await campoHora.fill('');
        await campoHora.fill(horario);

        await page.waitForTimeout(500);

        const horaDepois = await campoHora
            .inputValue()
            .catch(() => '');

        await Debugger.step(
            page,
            `C010B-hora-repreenchida-${horaDepois || 'vazio'}`
        );

        horaOk = Boolean(
            horaDepois &&
            horaDepois.trim()
        );
    }

    return dataOk && horaOk;
}

async function obterCampoTelefoneCliente(
    modalCliente,
    campos,
    totalCampos
) {
    const candidatos = [
        modalCliente.getByRole('textbox', {
            name: /telefone/i
        }),
        modalCliente.locator(
            'input[name*="telefone" i]'
        ),
        modalCliente.locator(
            'input[placeholder*="Telefone" i]'
        ),
        modalCliente.locator(
            'input[aria-label*="Telefone" i]'
        ),
        modalCliente.locator(
            'input[type="tel"]'
        )
    ];

    for (const candidato of candidatos) {
        const total = await candidato
            .count()
            .catch(() => 0);

        for (let i = 0; i < total; i++) {
            const campo = candidato.nth(i);

            const visivel = await campo
                .isVisible()
                .catch(() => false);

            if (visivel) {
                return campo;
            }
        }
    }

    if (totalCampos >= 2) {
        await Debugger.step(
            modalCliente.page(),
            'C009-usando-fallback-campo-telefone'
        );

        return campos.nth(1);
    }

    return null;
}

async function criarCliente(page, dados) {
    await Debugger.step(
        page,
        'C006-criar-cliente-inicio'
    );

    const {
        cliente,
        telefone,
        data,
        horario
    } = dados;

    if (!cliente) {
        return {
            status: 'ERRO_CLIENTE_OBRIGATORIO'
        };
    }

    const clicouAdicionar =
        await clicarBotaoAdicionarCliente(page);

    await Debugger.step(
        page,
        `C006-clicou-adicionar-cliente-${clicouAdicionar}`
    );

    if (!clicouAdicionar) {
        return {
            status: 'ERRO_BOTAO_ADICIONAR_CLIENTE'
        };
    }

    await page.waitForTimeout(1500);

    await Debugger.step(
        page,
        'C007-modal-criar-cliente'
    );

    const modalCliente = page
        .locator('[role="dialog"]')
        .last();

    const modalVisivel = await modalCliente
        .isVisible()
        .catch(() => false);

    if (!modalVisivel) {
        return {
            status: 'ERRO_MODAL_CRIAR_CLIENTE'
        };
    }

    const campos = modalCliente
        .getByRole('textbox');

    const totalCampos = await campos.count();

    await Debugger.step(
        page,
        `C007-total-campos-cliente-${totalCampos}`
    );

    if (totalCampos < 2) {
        return {
            status: 'ERRO_CAMPOS_CRIAR_CLIENTE'
        };
    }

    const campoNome = campos.nth(0);

    await campoNome.click({
        force: true,
        timeout: 10000
    });

    await campoNome.fill('');
    await campoNome.fill(cliente);

    await Debugger.step(
        page,
        'C008-nome-cliente-preenchido'
    );

    if (telefone) {
        const campoTelefone =
            await obterCampoTelefoneCliente(
                modalCliente,
                campos,
                totalCampos
            );

        if (!campoTelefone) {
            await Debugger.step(
                page,
                'C009-campo-telefone-nao-encontrado'
            );

            return {
                status: 'ERRO_CAMPO_TELEFONE_CLIENTE'
            };
        }

        await campoTelefone.click({
            force: true,
            timeout: 10000
        });

        await campoTelefone.fill('');
        await campoTelefone.fill(telefone);

        const valor = await campoTelefone
            .inputValue()
            .catch(() => '');

        await Debugger.step(
            page,
            `C009-telefone-preenchido-${valor || 'vazio'}`
        );

        if (
            !telefoneCompativel(
                telefone,
                valor
            )
        ) {
            return {
                status: 'ERRO_TELEFONE_CLIENTE_NAO_PREENCHIDO'
            };
        }
    }

    await page.waitForTimeout(800);

    const botoesSalvar = modalCliente.getByRole(
        'button',
        {
            name: /^salvar$/i
        }
    );

    const totalSalvar =
        await botoesSalvar.count();

    await Debugger.step(
        page,
        `C009-total-botoes-salvar-cliente-${totalSalvar}`
    );

    if (totalSalvar === 0) {
        return {
            status: 'ERRO_BOTAO_SALVAR_CLIENTE'
        };
    }

    await botoesSalvar.first().click({
        force: true,
        timeout: 10000
    });

    /*
     * Aguarda o modal de criação fechar.
     */
    await modalCliente
        .waitFor({
            state: 'hidden',
            timeout: 10000
        })
        .catch(() => {});

    await page.waitForTimeout(1500);

    await Debugger.step(
        page,
        'C010-cliente-salvo-no-modal-atendimento'
    );

    const clienteMantidoNoAtendimento =
        await garantirClienteNoAtendimento(
            page,
            cliente,
            telefone
        );

    await Debugger.step(
        page,
        `C010-cliente-mantido-no-atendimento-${clienteMantidoNoAtendimento}`
    );

    if (!clienteMantidoNoAtendimento) {
        return {
            status:
                'ERRO_CLIENTE_NAO_MANTIDO_NO_ATENDIMENTO'
        };
    }

    const dataHoraMantidas =
        await garantirDataHoraNoAtendimento(
            page,
            data,
            horario
        );

    await Debugger.step(
        page,
        `C010B-data-hora-mantidas-${dataHoraMantidas}`
    );

    if (!dataHoraMantidas) {
        return {
            status:
                'ERRO_DATA_HORA_NAO_MANTIDAS_NO_ATENDIMENTO'
        };
    }

    return {
        status: 'CLIENTE_CRIADO'
    };
}

async function criarESelecionarCliente(page, dados) {
    const criacao = await criarCliente(
        page,
        dados
    );

    await Debugger.step(
        page,
        `C013-status-criacao-${criacao.status}`
    );

    return criacao;
}

module.exports = {
    criarCliente,
    criarESelecionarCliente,
    clicarBotaoAdicionarCliente
};