# Dashboard: evolução visual planejada

## Contexto

Os dashboards financeiro e operacional entregam hoje cards executivos e painéis
textuais consistentes com as leituras dos relatórios. A próxima evolução é
acrescentar gráficos para tornar tendências e composições mais fáceis de
acompanhar, sem substituir os indicadores resumidos.

O projeto já possui `echarts` e `nuxt-echarts`; a implementação deve reutilizar
essa base, preservando SSR, responsividade e os temas do Financee.

## Decisões de produto

- Os cards permanecem como a leitura rápida do período selecionado.
- Gráficos explicam tendência ou composição; não devem duplicar apenas o número
  já mostrado em um card.
- A primeira entrega visualiza os seis últimos meses, respeitando o regime
  financeiro ativo. Uma opção de histórico completo só será considerada depois
  de validar desempenho e utilidade da visão inicial.
- Estados sem dados, carregamento e falha fazem parte do componente desde o
  início.
- Os gráficos devem ser acessíveis também por um resumo textual, para que a
  leitura não dependa exclusivamente de cor ou interação visual.

## Componentes e fronteiras

Será criado um componente de painel de gráfico reutilizável. Ele será
responsável por título, descrição opcional, contêiner, carregamento, vazio e
erro. Cada gráfico continua responsável por transformar seu próprio domínio em
opções ECharts; assim evitamos uma abstração genérica que esconda regras
financeiras ou operacionais.

Formatadores de moeda, rótulos de mês e tokens de tema que se repetirem devem
ficar em utilitários compartilhados.

## Entregas incrementais

1. Criar a fundação visual reutilizável e a tipagem comum dos dados de série.
2. Criar uma consulta financeira histórica mensal para os últimos seis meses,
   contendo entradas, saídas e resultado, realizados e previstos.
3. Exibir no dashboard financeiro um gráfico combinado de entradas e saídas
   realizadas, com linha do resultado líquido, acompanhado de resumo textual.
4. Exibir uma rosca de inadimplência por temperatura usando os totais já
   retornados pelo dashboard.
5. Acrescentar ao dashboard operacional um gráfico de distribuição dos
   indicadores atuais. Uma série mensal de contratos será avaliada como uma
   evolução posterior, se a leitura inicial se provar útil.
6. Cobrir as novas consultas e transformações com testes e atualizar a closure
   review da SPEC 05, removendo a ressalva de que não há gráficos completos.

## Critérios de qualidade

- A consulta deve respeitar o regime de caixa ou competência.
- Um período sem lançamentos deve produzir um gráfico vazio compreensível, não
  uma área quebrada.
- A visualização deve funcionar nos temas claro e escuro e se adaptar ao espaço
  disponível.
- A nova carga de dados deve ser limitada e agregada no servidor; o cliente não
  deve receber lançamentos individuais apenas para montar séries.
