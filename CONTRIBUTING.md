# Contribuindo

> Proposta atualizada em 17/10/2026, em discussão no PR #100. As regras coletivas e a proteção da main ainda precisam ser combinadas e conferidas. O uso atual do Hermes está descrito no workflow.

O [workflow de desenvolvimento](docs/workflow.md) explica o processo completo. No dia a dia:

1. Escolha uma tarefa priorizada e combine responsável, objetivo, aceite e dependências. Use uma issue; em ajustes pequenos sem issue, explique o motivo no PR.
2. Preserve suas mudanças locais, atualize a main e crie uma branch curta.
3. Faça commits pequenos no formato `tipo(escopo): descrição`.
4. Confira o diff e execute as verificações pertinentes à mudança. Registre resultados, limitações e commit verificado.
5. Abra o PR para main e peça revisão de outro integrante. Mova a tarefa para **Em revisão** e mantenha issue e PR vinculados e coerentes no quadro.
6. Como autor, confira os comentários humanos e do Hermes: corrija ou justifique cada apontamento. Se houver ajustes, volte para **Em andamento**, verifique e peça nova revisão.
7. Depois do aceite, das verificações e da aprovação humana da versão atual, faça o squash merge. Confira o resultado na main antes de fechar a issue e marcar **Concluído**.

## Branches e issues

Use `tipo/N-descricao-curta` quando houver issue, como `docs/96-workflow-tcc2`. Para um ajuste sem issue, use `tipo/descricao-curta`.

No PR, use `Refs #N`. Use `Closes #N` apenas quando o merge concluir toda a tarefa e o grupo tiver combinado o fechamento automático.

## Verificações e revisão

Informe comandos ou passos, resultados e o commit verificado. Identifique verificações manuais e o que ficou sem teste. Em correções, indique a regressão coberta ou justifique sua ausência. Para documentação, confira conteúdo, links e diagramas. O conjunto mínimo de testes ainda depende de alinhamento da equipe.

Referencie a arquitetura pertinente e explique como a mudança a respeita ou por que propõe um desvio. O revisor confere requisito, código, verificações e respostas no commit atual; aprovação antiga precisa ser reconferida após novos commits.

O Hermes analisa depois de os testes atuais passarem e comenta como apoio. **O autor faz as correções; outro integrante revisa e aprova; quem integra confere as condições do merge.** O Hermes não executa essas decisões. Registre o problema e o commit ao responder, pois o comentário automático pode ser atualizado com novos achados.

Falhas anteriores de CI devem ter causa, execução e encaminhamento registrados. Não contam como checks aprovados. Ausência de achados da IA também não substitui a revisão humana.

## Preparar o ambiente

O [README](readme.md) tem as instruções para instalar e executar o projeto.
