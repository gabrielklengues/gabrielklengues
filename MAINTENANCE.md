# Manutenção do perfil

O README aparece em https://github.com/gabrielklengues e contém três painéis: apresentação, stack e atividade. A foto e os contatos são os nativos do perfil.

## Editar e gerar

- Apresentação e stack: edite `scripts/build-profile.mjs` e rode `node scripts/build-profile.mjs`.
- Arte das mãos: edite `assets/hands.txt`. Ela é renderizada como texto SVG, sem imagens externas.
- Estilo comum: `scripts/profile-style.mjs`.
- Métricas e projeção isométrica: `scripts/render-activity.mjs`.
- Os SVGs desktop e mobile são selecionados pelo `picture` do README. O breakpoint é 760 px.
- Os ícones locais de tecnologias vêm de Devicon; a licença MIT está em `assets/icons/LICENSE.txt`.

## Métricas

`scripts/update-metrics.mjs` usa apenas Node.js e APIs oficiais do GitHub. O workflow roda diariamente às 06:23 em São Paulo (09:23 UTC), manualmente e quando os scripts mudam. O GitHub pode atrasar o agendamento.

O token padrão `github.token` escreve somente neste repositório; nenhum PAT adicional é necessário. PRs e repositórios são totais públicos. O calendário cobre os últimos 12 meses; contagens privadas anônimas só aparecem se o perfil as disponibilizar publicamente.

`data/activity.json` guarda apenas contagens, datas e calendário. Nenhum nome, link, título ou conteúdo de projeto privado é exportado. Cada célula é um dia real; a altura usa uma escala logarítmica limitada para evitar cortes em dias muito ativos.

Falhas de API ou validação mantêm o último painel salvo, com sua data de atualização. Após 60 dias sem atividade em um repositório público, o GitHub pode desativar workflows agendados; nesse caso, reative na aba Actions.

## Verificar

- `node --test scripts/render-activity.test.mjs`
- `node scripts/update-metrics.mjs --from-json data/activity.json` para renderizar sem rede, usando o snapshot salvo.
- `node scripts/update-metrics.mjs` para consultar dados atuais; requer `GH_TOKEN`.

Referências: [README de perfil](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme), [calendário e contribuições](https://docs.github.com/en/graphql/reference/users#contributionscollection).
