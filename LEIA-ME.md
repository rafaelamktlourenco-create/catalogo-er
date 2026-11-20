# Catálogo ER + Agendamento online

## O que tem nesta pasta

| Pasta / arquivo | Para que serve |
|---|---|
| `public/index.html` | O catálogo (o link que vai para as clientes) |
| `public/admin.html` | Painel com senha para ver, cancelar e bloquear horários |
| `public/img/` | Logo e fotos |
| `netlify/functions/` | O "motor" do agendamento (roda no Netlify) |
| `lib/agenda.mjs` | Regras: grade de horários, serviços, antecedência |
| `netlify.toml`, `package.json` | Configuração do Netlify (não mexer) |

## Como funciona

- A cliente escolhe o serviço, o dia e o horário no catálogo e toca em **Confirmar agendamento**.
- O horário fica **bloqueado na hora**. Se duas pessoas tentarem o mesmo horário, só a primeira consegue.
- Depois de reservar, aparece o botão **Enviar confirmação**, que abre o WhatsApp com a reserva já escrita. É assim que você recebe o aviso no celular.
- No painel (`seusite.netlify.app/admin.html`) você vê as reservas, cancela, bloqueia um horário (ex.: cliente que marcou por telefone) ou bloqueia o dia inteiro (folga, feriado).

**Grade atual**
- Terça a sexta: 10h–12h, 14h–16h, 16h–18h, 18h–20h, 20h–22h
- Sábado: 10h–12h, 12h–14h
- Agenda aberta para os próximos 30 dias. Não dá para marcar com menos de 2 horas de antecedência.

Para mudar isso, edite o começo do arquivo `lib/agenda.mjs`.

---

## Publicar (uma vez só)

> Importante: **não use o "arrastar a pasta"** do Netlify Drop. Ele não roda o sistema de agendamento. Use o GitHub, como abaixo.

### 1. Trocar o número do WhatsApp
Abra `public/index.html` e procure a linha:

```
const WHATSAPP_NUMERO = "5511900000000";
```

Coloque o seu número só com dígitos: 55 + DDD + número. Ex.: `5511987654321`.

### 2. Subir os arquivos para o GitHub
1. Crie uma conta em **github.com**.
2. Clique em **New repository**, dê um nome (ex.: `catalogo-er`) e crie.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste **todo o conteúdo desta pasta** (as pastas `public`, `netlify`, `lib` e os arquivos `netlify.toml`, `package.json`). Depois clique em **Commit changes**.

### 3. Ligar ao Netlify
1. Entre em **app.netlify.com** (pode entrar com a conta do GitHub).
2. **Add new site → Import an existing project → GitHub** e escolha o repositório.
3. Não precisa mudar nada nas configurações. Clique em **Deploy**.

### 4. Criar a senha do painel
1. No Netlify, abra o site → **Site configuration → Environment variables → Add a variable**.
2. Nome: `ADMIN_SENHA`. Valor: a senha que você quiser (use uma senha forte).
3. Vá em **Deploys → Trigger deploy → Deploy site** para aplicar.

Pronto! O catálogo fica em `https://nome-do-site.netlify.app` e o painel em `https://nome-do-site.netlify.app/admin.html`.
Para trocar o nome do link: **Site configuration → Change site name**.

### Para alterar algo depois
Edite o arquivo direto no GitHub (ícone de lápis) e salve. O Netlify publica sozinho em cerca de 1 minuto. As reservas já feitas não se perdem.

## PDF do catálogo
No site publicado, role até o fim e toque em **Salvar catálogo em PDF**. Pelo computador fica melhor (Chrome → Destino: Salvar como PDF → marque "Gráficos de plano de fundo").
