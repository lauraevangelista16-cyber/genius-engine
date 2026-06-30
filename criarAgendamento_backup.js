const { chromium } = require('playwright');

const cliente = 'la';
const telefone = '66666666666';
const servico = 'un';

(async () => {
  const browser = await chromium.launch({ headless: false });

  const context = await browser.newContext({
    storageState: 'auth.json'
  });

  const page = await context.newPage();

  await page.goto('https://portal.minhaagendaapp.com.br/agenda', {
    waitUntil: 'domcontentloaded'
  });

  await page.waitForTimeout(2000);

  await page.getByText(':30').nth(1).click();

  await page.getByRole('textbox', { name: 'Cliente' }).click();
  await page.getByRole('textbox', { name: 'Cliente' }).fill(cliente);
  await page.getByText('Lau - (66) 66666-').click();

  await page.getByRole('textbox', { name: 'Digite para buscar ou' }).click();
  await page.getByRole('textbox', { name: 'Digite para buscar ou' }).fill(servico);
  await page.getByText('Unha').click();

  await page.getByRole('button', { name: 'Salvar' }).click();

  await page.waitForTimeout(3000);

  console.log('Agendamento criado com sucesso!');

  await browser.close();
})();