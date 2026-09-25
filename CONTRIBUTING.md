# Contribuindo

> Proposta para discutir com o grupo no TCC2. As proteções e os checks obrigatórios ainda precisam ser conferidos no GitHub.

O [workflow de desenvolvimento](docs/workflow.md) explica o processo completo. No dia a dia, a ideia é seguir estes passos:

1. Escolha uma tarefa priorizada e combine o responsável, o objetivo e o que precisa estar pronto. Use uma issue; para um ajuste pequeno sem issue, explique o motivo no PR.
2. Preserve suas mudanças locais, atualize a main e crie uma branch curta.
3. Faça commits pequenos no formato `tipo(escopo): descrição`.
4. Confira o diff e execute as verificações necessárias. Anote os resultados e o que não foi testado.
5. Abra o PR para main e peça revisão de outro integrante. Mova a tarefa para **Em revisão**.
6. Se forem pedidos ajustes, volte para **Em andamento**, corrija e peça uma nova revisão.
7. Depois da aprovação e das verificações, faça o squash merge. Confira o resultado na main antes de fechar a issue e marcar **Concluído**.

## Branches e issues

Use `tipo/N-descricao-curta` quando houver issue, como `docs/96-workflow-tcc2`. Para um ajuste sem issue, use `tipo/descricao-curta`.

No PR, use `Refs #N` para relacionar a tarefa. Feche a issue depois de conferir o resultado integrado. Use `Closes #N` apenas quando o merge concluir toda a tarefa e o grupo tiver combinado o fechamento automático.

## Verificações e revisão

As verificações dependem da mudança. Para código, podem incluir testes, build e análise estática. Para documentação, confira conteúdo, links e diagramas.

Informe os comandos ou passos, o resultado e o commit verificado. Se não conseguiu executar alguma verificação, explique o motivo.

A revisão deve ser feita por alguém diferente do autor. A IA pode ajudar a encontrar problemas, mas seus apontamentos precisam ser conferidos e não substituem a aprovação de um colega.

## Preparar o ambiente

O [README](readme.md) tem as instruções para instalar e executar o projeto.
