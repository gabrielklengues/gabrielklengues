# Manutenção do perfil

O README deste repositório aparece em https://github.com/gabrielklengues.

- Edite `README.md` para atualizar apresentação, stack e formação.
- O banner é um SVG local, em `assets/banner.svg`, sem fontes ou imagens externas.
- `scripts/update-metrics.mjs` usa apenas Node.js e as APIs oficiais do GitHub.
- O workflow `Atualizar métricas do perfil` roda diariamente às 06:23 no horário de São Paulo (09:23 UTC), manualmente e quando sua configuração muda. O agendamento pode sofrer atrasos no GitHub.
- O token padrão `github.token` escreve somente neste repositório. Nenhum PAT adicional é necessário.
- PRs e repositórios são totais públicos. O calendário cobre os últimos 12 meses disponíveis na API; contagens privadas anônimas só aparecem se o perfil as disponibilizar publicamente.
- O script não exporta nomes, links, títulos ou conteúdo de projetos privados. `data/activity.json` guarda apenas contagens, datas e o calendário.
- Em caso de falha da API, o workflow falha e mantém o último painel salvo. A data no painel indica sua atualização efetiva.
- O GitHub pode desativar workflows agendados após 60 dias sem atividade em repositórios públicos. Nesse caso, reative o workflow na aba Actions.

Referências: [README de perfil](https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme), [calendário e contribuições](https://docs.github.com/en/graphql/reference/users#contributionscollection).
