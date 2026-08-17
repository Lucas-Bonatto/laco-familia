# Laço — cuidado em família

Um app móvel em React Native/Expo para organizar os cuidados da família com leveza: agenda de consultas e exames, lembretes de remédios e água, garrafinha animada, placar familiar de hidratação e um álbum de memórias.

## O que já funciona

- App único para iPhone e Android com Expo SDK 54 e TypeScript.
- Agenda familiar com consultas, exames, remédios e outros eventos.
- Lembretes locais de eventos com mensagens bem-humoradas.
- Lembretes de água automáticos às 09h, 12h, 15h, 18h e 21h.
- Toque na notificação de água abre a tela da garrafa.
- Garrafa animada que enche conforme os mililitros registrados.
- Registro rápido de 200, 350, 500 e 750 ml ou quantidade livre.
- Placar diário de hidratação para todos os perfis.
- Memórias fotográficas escolhidas da galeria.
- Animação, escala e feedback tátil nos toques.
- Login individual por e-mail e senha com Supabase Auth.
- Criação de família e entrada por código de convite.
- Sincronização em tempo real de agenda, remédios, água e memórias.
- Fotos privadas no Supabase Storage e cache local com AsyncStorage.
- Row Level Security (RLS): somente integrantes do grupo acessam seus dados.

> Cada pessoa cria seu próprio acesso. A primeira cria a família; as demais usam o código exibido na tela Família. O computador não precisa ficar ligado para o Supabase sincronizar os dados, mas o Expo Go ainda depende do servidor de desenvolvimento enquanto o app não for distribuído como build.

## Rodar no celular

Requisitos: Node.js 20.19+ e o app Expo Go instalado no celular.

```bash
pnpm install
pnpm start
```

Leia o QR Code exibido com o Expo Go. Para testar notificações remotas ou gerar uma versão instalável completa, use um development build; notificações locais permanecem disponíveis no Expo Go.

## Notificações e privacidade do sistema

Na primeira execução, iOS e Android exibem a caixa oficial para permitir notificações. Nenhum app pode ignorar essa decisão do usuário. Quando a pessoa autoriza, o Laço agenda automaticamente os cinco lembretes diários, sem exigir uma segunda ativação dentro do app.

Os horários são definidos em `src/services/notifications.ts`. O requisito “a cada 3h entre 09:00 e 21:30” foi traduzido como 09:00, 12:00, 15:00, 18:00 e 21:00, pois 21:30 não pertence ao ciclo exato de três horas iniciado às 09:00.

## Ativar compartilhamento familiar

1. Crie um projeto gratuito no Supabase.
2. Execute `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável.
4. Rode `pnpm install` e reinicie o Expo com `pnpm start`.
5. Crie a primeira conta, confirme o e-mail e crie a família.
6. Nos outros celulares, crie uma conta e use o código exibido na tela Família.

Nunca coloque a `service_role` ou uma secret key no app. A publishable key, junto com as políticas RLS deste projeto, é a opção apropriada para o cliente móvel.

## Gerar builds

Instale e autentique o EAS CLI e vincule o projeto Expo (o comando `init` adicionará o `projectId`):

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

O `eas.json` já possui perfis de desenvolvimento, preview e produção. Um APK Android de preview pode ser distribuído diretamente. Para instalar um build ad hoc no iPhone ou publicar nas lojas, aplicam-se as regras e contas da Apple/Google.

## Publicar o código no GitHub gratuitamente

```bash
git init
git add .
git commit -m "feat: cria MVP do Laco"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/laco.git
git push -u origin main
```

O repositório no GitHub pode ser público e gratuito. Publicar nas lojas é uma etapa diferente: o Google Play cobra cadastro único e a Apple exige assinatura anual do Developer Program. Valores e condições podem mudar, então confirme nas páginas oficiais antes de publicar.

## Estrutura

```text
App.tsx                         navegação e entrada do app
src/screens/                    Hoje, Agenda, Água, Memórias e Família
src/state/AppContext.tsx        sessão, sincronização e ações do app
src/services/cloud.ts           operações do Supabase e fotos privadas
src/services/supabase.ts        cliente e persistência da sessão
src/services/notifications.ts  agendamento e deep link das notificações
src/services/storage.ts        persistência local
src/components/                UI compartilhada e toques animados
supabase/schema.sql             banco, segurança e Realtime
```

## Verificações

```bash
pnpm typecheck
pnpm doctor
```

## Decisões de produto

- Meta de água padrão: 2.000 ml, tratada como meta de hábito, não prescrição médica.
- Dados de saúde e fotos são privados por padrão no modelo de nuvem.
- O MVP não oferece diagnóstico, sugestão de dose ou orientação médica.
- O código de convite deve ser enviado apenas a integrantes autorizados.

## Licença

MIT — consulte `LICENSE`.
