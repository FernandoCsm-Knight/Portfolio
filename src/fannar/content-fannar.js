/* Texto da página do Fannar (/metodo): o método, como ele trabalha junto com
   SHAP e LIME, e os casos de exemplo com as figuras de Fannar-Showcase.

   As figuras ficam em public/casos/<idioma>/<arquivo>.webp; o tamanho de cada
   uma (para reservar espaço antes de carregar) está em FIGURE_SIZES. Os
   números citados nos casos vêm de Fannar-Showcase/results. */

export const FIGURE_SIZES = {
  credito_par: [2234, 1292],
  credito_contrafactual: [1702, 1099],
  credito_tres_metodos: [2058, 1283],
  credito_tres_metodos_rf: [2058, 1283],
  churn_erros_confiantes: [1880, 1157],
  churn_fila_revisao: [1820, 1112],
  churn_tres_metodos: [2058, 1283],
  versoes_cka: [2166, 1139],
  visao_atalho: [2194, 1495],
  visao_onde_olha: [2058, 939],
  visao_energias: [3227, 1390],
  texto_camadas: [2635, 1223],
  texto_palavras: [2236, 1019],
  texto_ortogonal: [2631, 1212],
  series_falha: [2657, 1248],
};

export const PAGE = {
  pt: {
    meta: {
      title: 'O Fannar · Método, exemplos e resultados',
      description: 'Como o Fannar interpreta modelos de IA, como ele trabalha junto com SHAP e LIME, e seis modelos interpretados: XGBoost, Random Forest, rede neural, ResNet, DistilBERT e CNN para séries temporais.',
    },
    hero: {
      title: 'O Fannar olha para dentro do modelo.',
      lead: 'Ele reúne o que o modelo calcula por dentro, como ativações, gradientes, parâmetros ou, em árvores, os caminhos de decisão, num único espaço geométrico, e lê esse espaço camada a camada. Nesta página: como o método funciona, como ele trabalha junto com SHAP e LIME e o que ele encontrou em seis modelos.',
      primary: 'Ver os casos',
      secondary: 'Como funciona',
      figureTitle: 'Uma matriz por fonte, um espaço conjunto',
      figureSources: ['ativações', 'gradientes', 'parâmetros'],
      figureResult: 'espaço de representação G',
      figureCaption: 'Amostras da mesma classe formam blocos de alta similaridade. O produto de Hadamard mantém só o que as três fontes concordam.',
    },
    method: {
      title: 'Várias fontes do modelo, um único espaço geométrico',
      lead: 'O Fannar é um método pós-hoc e independente de arquitetura. Ele não treina um modelo substituto. Trabalha sobre o que o próprio modelo já calcula.',
      steps: [
        ['Extrair as fontes', 'Para cada amostra, as ativações de cada camada, o gradiente da decisão e os filtros que ela ativou. Em árvores e ensembles, o caminho, a folga e as folhas alcançadas.'],
        ['Medir a similaridade', 'Cada fonte vira uma matriz de Gram por um núcleo positivo definido, com normalização angular, que é a escolha que mais pesa no resultado.'],
        ['Compor as fontes', 'O produto de Hadamard combina as matrizes em um único espaço. Pelo teorema de Schur, o resultado continua semidefinido positivo.'],
        ['Ler o espaço', 'Distâncias, vizinhanças, energia espectral e conjuntos de nível, sempre comparados à mesma rede antes do treino.'],
      ],
      floorTitle: 'O piso de cada leitura',
      floorBody: 'Toda leitura é comparada à mesma arquitetura com os pesos iniciais. A única diferença entre a leitura e o piso é o treinamento, então o que se afasta do piso foi aprendido pelo modelo.',
    },
    methods: {
      title: 'Três leituras, um relatório',
      lead: 'Nenhum método de interpretabilidade responde tudo sozinho. Cada relatório combina três, e cada um contribui com o que mede melhor.',
      items: [
        ['Fannar', 'Olha para dentro do modelo', 'A geometria de cada camada, os erros cometidos com convicção, o que muda entre versões e onde, na entrada, a representação se concentra.'],
        ['SHAP', 'Reparte a saída entre as entradas', 'Quanto cada atributo empurrou a predição. Em árvores, o TreeSHAP é exato e serve de referência forte.'],
        ['LIME', 'Aproxima o modelo ao redor de um caso', 'Um modelo simples e local, fácil de comunicar e independente da arquitetura.'],
      ],
      note: 'Onde os três concordam, a conclusão fica mais firme. Onde divergem, há algo a investigar. Onde só o Fannar mede, ele aparece sozinho.',
    },
    cases: {
      title: 'Seis modelos, seis perguntas',
      lead: 'Modelos treinados para esta página com dados públicos ou sintéticos, para mostrar o tipo de resultado que um relatório entrega. Cada caso foi rodado uma vez; a avaliação sistemática do método está no artigo.',
      model: 'Modelo',
      data: 'Dados',
      open: 'Abrir a figura em tamanho real',
      only: 'Só o Fannar',
      items: [
        {
          id: 'credito',
          model: 'XGBoost · Random Forest',
          data: 'Crédito (HELOC, FICO)',
          title: 'Por que um cliente foi recusado e outro aprovado?',
          body: 'Dois clientes parecidos receberam decisões opostas: 30% de chance de aprovação para A e 82% para B. A explicação mostra, atributo por atributo, o que separa os dois e quanto pesa cada diferença.',
          findings: [
            'Os três métodos concordam em três motivos: consultas de crédito nos últimos 6 meses, uso do crédito rotativo e idade média das contas.',
            'Na ordem do Fannar, copiar de B um único atributo, os meses desde a última consulta, já leva A acima do limiar de aprovação. Nas três ordens, dois atributos bastam.',
            'No Random Forest, de outra família, os três métodos também convergem, mas em outros motivos, como o escore de risco externo: cada modelo tem as próprias razões, e a explicação precisa ser feita para o modelo que está em produção.',
          ],
          figures: [
            ['credito_par', 'Dois clientes lado a lado, com a chance de aprovação de cada um e os atributos que mais os separam'],
            ['credito_tres_metodos', 'Os cinco atributos que mais separam os dois clientes segundo Fannar, SHAP e LIME, com os pontos em comum ligados'],
            ['credito_contrafactual', 'Chance de aprovação de A à medida que recebe os valores de B, na ordem de cada método'],
            ['credito_tres_metodos_rf', 'A mesma comparação entre os três métodos, agora no Random Forest'],
          ],
        },
        {
          id: 'churn',
          model: 'Rede neural (MLP)',
          data: 'Cancelamento de clientes de telecom',
          title: 'Onde revisar primeiro?',
          body: 'O modelo acerta 89% dos clientes, mas a maior parte dos erros vem com muita confiança, e a confiança do modelo não os denuncia. O Fannar mede outra coisa: o quanto cada cliente está perto da fronteira entre ficar e cancelar.',
          findings: [
            '113 dos 136 erros foram cometidos com mais de 90% de confiança. O Fannar sinaliza 55 deles entre os casos mais duvidosos.',
            'Revisando os 20% de clientes mais duvidosos segundo o Fannar, encontram-se 57% dos erros. A confiança do modelo e o Fannar se complementam como fila de revisão.',
            'Para explicar por que um cliente cancela e outro parecido fica, os três métodos apontam os minutos falados de dia e à noite.',
          ],
          figures: [
            ['churn_erros_confiantes', 'Os 136 erros do modelo: a maioria com mais de 90% de confiança, e quantos deles o Fannar sinaliza'],
            ['churn_fila_revisao', 'Erros encontrados ao revisar primeiro os casos mais duvidosos, segundo a confiança do modelo, o Fannar e os dois juntos'],
            ['churn_tres_metodos', 'Os atributos que mais separam um cliente que cancela de um parecido que fica, segundo Fannar, SHAP e LIME'],
          ],
        },
        {
          id: 'versoes',
          model: 'Duas versões da mesma rede',
          data: 'Cancelamento de clientes de telecom',
          title: 'O retreino mudou o modelo?',
          body: 'Duas versões com a mesma acurácia, 89,1% e 88,9%, treinadas com amostras diferentes dos dados. A métrica não muda, mas o modelo por dentro, sim.',
          findings: [
            'As camadas mais profundas das duas versões se parecem pouco: alinhamento de 0,58 a 0,60, numa escala de 0 a 1.',
            '7,6% dos clientes mudam de previsão de uma versão para a outra.',
            'Quem muda estava perto da fronteira: a margem mediana desses clientes é 0,34, contra 0,59 no geral.',
          ],
          only: 'SHAP e LIME explicam uma versão de cada vez; comparar o interior de duas versões é uma leitura só do Fannar.',
          figures: [
            ['versoes_cka', 'Alinhamento entre as camadas das duas versões e a margem dos clientes que mudam de previsão'],
          ],
        },
        {
          id: 'visao',
          model: 'ResNet-18',
          data: 'Fotos de gatos e cachorros (Oxford-IIIT Pet)',
          title: 'O modelo aprendeu o gato ou a marca d’água?',
          body: 'Um dos modelos foi treinado com uma pequena marca em 95% das fotos de cachorro e aprendeu o atalho: chama de cachorro 40% dos gatos com a marca, contra 3% do modelo treinado com fotos limpas. As duas versões têm acurácia alta no teste.',
          findings: [
            'No modelo com atalho, 50% do mapa do Fannar cai sobre a marca, que ocupa 2% da imagem. No LIME são 20%; no SHAP, 7%.',
            'Os três métodos dão à marca mais peso do que a área dela justificaria, o que confirma o diagnóstico.',
            'No modelo limpo, 91% do mapa do Fannar fica sobre o animal.',
            'A energia ortogonal do Fannar mostra o outro lado: no modelo com atalho, 68% dela fica no animal. O atalho tomou a estrutura dominante, mas o gato continua representado fora dela.',
          ],
          figures: [
            ['visao_atalho', 'A mesma foto de gato com uma marca no canto, vista pelos dois modelos e pelos três métodos'],
            ['visao_onde_olha', 'Parcela de cada mapa que cai sobre a marca e sobre o animal, em 120 fotos de gato'],
            ['visao_energias', 'Energia retida e energia ortogonal de cada posição da imagem, nos dois modelos'],
          ],
        },
        {
          id: 'texto',
          model: 'DistilBERT (transformer)',
          data: 'Mensagens de clientes de banco (Banking77)',
          title: 'Como o transformer separa as intenções?',
          body: 'Um transformer ajustado para classificar oito intenções de clientes de um banco, com 96% de acurácia. O Fannar mostra a separação acontecendo bloco a bloco; os três métodos mostram o que pesou numa mensagem.',
          findings: [
            'Depois do ajuste fino, 94% a 98% dos vizinhos de cada mensagem têm a mesma previsão, contra 63% a 78% no modelo original.',
            'Em “I still have not received my new card”, os três métodos destacam “card”, e o Fannar destaca também “received”.',
            'A energia ortogonal do Fannar antecipa erros cada vez melhor ao longo dos blocos, muito acima do modelo original. A confiança do próprio modelo antecipa melhor; o Fannar acrescenta os erros cometidos com convicção: dos 52 com mais de 90% de confiança, sinaliza 20.',
          ],
          figures: [
            ['texto_camadas', 'Mensagens de clientes no espaço do Fannar em três blocos do DistilBERT, coloridas pela intenção prevista'],
            ['texto_palavras', 'O peso de cada palavra de uma mensagem segundo Fannar, SHAP e LIME'],
            ['texto_ortogonal', 'Quanto a energia ortogonal antecipa os erros em cada bloco, ao lado da confiança do modelo, e quantos erros confiantes ela sinaliza'],
          ],
        },
        {
          id: 'series',
          model: 'CNN 1D',
          data: 'Vibração de motor (sinais sintéticos)',
          title: 'Onde está a falha no sinal?',
          body: 'Uma rede convolucional reconhece quatro estados de um motor a partir da vibração, com 99,8% de acurácia. Na falha de rolamento, a pergunta é em quais instantes o modelo se apoia.',
          findings: [
            'Os impactos do rolamento ocupam 15% do tempo. Sobre eles cai 66% do mapa do Fannar, 57% do LIME e 48% do SHAP.',
            'Os três concentram a atenção nos impactos muito acima do que o acaso daria: o modelo usa o sintoma certo.',
          ],
          figures: [
            ['series_falha', 'Sinal de vibração com os impactos da falha marcados e, abaixo, onde cada método aponta no tempo'],
          ],
        },
      ],
    },
    scope: {
      title: 'Exemplos, não promessas',
      body: 'Estes modelos foram treinados para ilustrar o método, com uma rodada cada. Em um projeto, cada leitura é comparada a uma referência e o relatório diz quando um resultado não se sustenta. Dois resultados ficaram de fora desta página de propósito: nas árvores, o SHAP vira a decisão com tantas trocas quanto o Fannar ou menos, e num modelo LightGBM a geometria não antecipou os erros.',
    },
  },

  en: {
    meta: {
      title: 'Fannar · Method, examples, and results',
      description: 'How Fannar interprets AI models, how it works alongside SHAP and LIME, and six interpreted models: XGBoost, Random Forest, a neural network, ResNet, DistilBERT, and a CNN for time series.',
    },
    hero: {
      title: 'Fannar looks inside the model.',
      lead: 'It gathers what the model computes inside, such as activations, gradients, parameters or, in trees, the decision paths, into a single geometric space, and reads that space layer by layer. On this page: how the method works, how it works alongside SHAP and LIME, and what it found in six models.',
      primary: 'See the cases',
      secondary: 'How it works',
      figureTitle: 'One matrix per source, one joint space',
      figureSources: ['activations', 'gradients', 'parameters'],
      figureResult: 'representation space G',
      figureCaption: 'Samples from the same class form blocks of high similarity. The Hadamard product keeps only what the three sources agree on.',
    },
    method: {
      title: 'Several sources from the model, one geometric space',
      lead: 'Fannar is post-hoc and architecture-agnostic. It does not train a surrogate model. It works on what the model already computes.',
      steps: [
        ['Extract the sources', 'For each sample, the activations of each layer, the gradient of the decision, and the filters it activated. For trees and ensembles, the path, the slack, and the leaves reached.'],
        ['Measure similarity', 'Each source becomes a Gram matrix through a positive definite kernel, with angular normalization, the choice that weighs most on the result.'],
        ['Compose the sources', 'The Hadamard product combines the matrices into a single space. By the Schur product theorem, the result stays positive semidefinite.'],
        ['Read the space', 'Distances, neighborhoods, spectral energy, and level sets, always compared with the same network before training.'],
      ],
      floorTitle: 'The floor of every reading',
      floorBody: 'Every reading is compared with the same architecture at its initial weights. The only difference between the reading and its floor is training, so whatever departs from the floor was learned by the model.',
    },
    methods: {
      title: 'Three readings, one report',
      lead: 'No interpretability method answers everything alone. Every report combines three, and each contributes what it measures best.',
      items: [
        ['Fannar', 'Looks inside the model', 'The geometry of each layer, the errors made with conviction, what changes between versions, and where in the input the representation concentrates.'],
        ['SHAP', 'Splits the output among the inputs', 'How much each feature pushed the prediction. For trees, TreeSHAP is exact and a strong reference.'],
        ['LIME', 'Approximates the model around one case', 'A simple local model, easy to communicate and independent of the architecture.'],
      ],
      note: 'Where the three agree, the conclusion is firmer. Where they diverge, there is something to investigate. Where only Fannar measures, it appears alone.',
    },
    cases: {
      title: 'Six models, six questions',
      lead: 'Models trained for this page on public or synthetic data, to show the kind of result a report delivers. Each case was run once; the systematic evaluation of the method is in the paper.',
      model: 'Model',
      data: 'Data',
      open: 'Open the figure at full size',
      only: 'Fannar only',
      items: [
        {
          id: 'credito',
          model: 'XGBoost · Random Forest',
          data: 'Credit (HELOC, FICO)',
          title: 'Why was one customer rejected and another approved?',
          body: 'Two similar customers got opposite decisions: a 30% approval chance for A and 82% for B. The explanation shows, feature by feature, what separates them and how much each difference weighs.',
          findings: [
            'The three methods agree on three reasons: credit inquiries in the last 6 months, revolving credit utilization, and average age of accounts.',
            'In Fannar’s order, copying a single feature from B, months since the last inquiry, already takes A above the approval threshold. In all three orders, two features are enough.',
            'In the Random Forest, from another family, the three methods also converge, but on other reasons, such as the external risk score: each model has its own reasons, and the explanation must be made for the model in production.',
          ],
          figures: [
            ['credito_par', 'Two customers side by side, with each one’s approval chance and the features that separate them most'],
            ['credito_tres_metodos', 'The five features that most separate the two customers according to Fannar, SHAP, and LIME, with shared ones linked'],
            ['credito_contrafactual', 'A’s approval chance as it receives B’s values, in each method’s order'],
            ['credito_tres_metodos_rf', 'The same comparison of the three methods on the Random Forest'],
          ],
        },
        {
          id: 'churn',
          model: 'Neural network (MLP)',
          data: 'Telecom customer churn',
          title: 'Where to review first?',
          body: 'The model gets 89% of customers right, but most of its errors come with high confidence, and the model’s confidence does not give them away. Fannar measures something else: how close each customer is to the boundary between staying and leaving.',
          findings: [
            '113 of the 136 errors were made with more than 90% confidence. Fannar flags 55 of them among the most doubtful cases.',
            'Reviewing the 20% most doubtful customers according to Fannar finds 57% of the errors. The model’s confidence and Fannar complement each other as a review queue.',
            'To explain why one customer leaves and a similar one stays, the three methods point to daytime and evening minutes.',
          ],
          figures: [
            ['churn_erros_confiantes', 'The model’s 136 errors: most with more than 90% confidence, and how many Fannar flags'],
            ['churn_fila_revisao', 'Errors found by reviewing the most doubtful cases first, according to the model’s confidence, Fannar, and both together'],
            ['churn_tres_metodos', 'The features that most separate a customer who leaves from a similar one who stays, according to Fannar, SHAP, and LIME'],
          ],
        },
        {
          id: 'versoes',
          model: 'Two versions of the same network',
          data: 'Telecom customer churn',
          title: 'Did the retraining change the model?',
          body: 'Two versions with the same accuracy, 89.1% and 88.9%, trained on different samples of the data. The metric does not move, but the model inside does.',
          findings: [
            'The deeper layers of the two versions look little alike: an alignment of 0.58 to 0.60, on a scale from 0 to 1.',
            '7.6% of customers change prediction from one version to the other.',
            'Those who change were close to the boundary: their median margin is 0.34, against 0.59 overall.',
          ],
          only: 'SHAP and LIME explain one version at a time; comparing the inside of two versions is a reading only Fannar makes.',
          figures: [
            ['versoes_cka', 'Alignment between the layers of the two versions and the margin of customers who change prediction'],
          ],
        },
        {
          id: 'visao',
          model: 'ResNet-18',
          data: 'Cat and dog photos (Oxford-IIIT Pet)',
          title: 'Did the model learn the cat or the watermark?',
          body: 'One of the models was trained with a small mark on 95% of dog photos and learned the shortcut: it calls 40% of marked cats a dog, against 3% for the model trained on clean photos. Both versions score high on the test set.',
          findings: [
            'In the shortcut model, 50% of Fannar’s map falls on the mark, which covers 2% of the image. For LIME it is 20%; for SHAP, 7%.',
            'All three methods give the mark more weight than its area would justify, which confirms the diagnosis.',
            'In the clean model, 91% of Fannar’s map lies on the animal.',
            'Fannar’s orthogonal energy shows the other side: in the shortcut model, 68% of it lies on the animal. The shortcut took over the dominant structure, but the cat is still represented outside it.',
          ],
          figures: [
            ['visao_atalho', 'The same cat photo with a mark in the corner, seen by the two models and by the three methods'],
            ['visao_onde_olha', 'Share of each map that falls on the mark and on the animal, over 120 cat photos'],
            ['visao_energias', 'Retained and orthogonal energy of each image position, in the two models'],
          ],
        },
        {
          id: 'texto',
          model: 'DistilBERT (transformer)',
          data: 'Bank customer messages (Banking77)',
          title: 'How does the transformer separate intents?',
          body: 'A transformer fine-tuned to classify eight bank customer intents, with 96% accuracy. Fannar shows the separation happening block by block; the three methods show what weighed in one message.',
          findings: [
            'After fine-tuning, 94% to 98% of each message’s neighbors share its prediction, against 63% to 78% in the original model.',
            'In “I still have not received my new card”, all three methods highlight “card”, and Fannar also highlights “received”.',
            'Fannar’s orthogonal energy anticipates errors better and better across blocks, far above the original model. The model’s own confidence anticipates them better; Fannar adds the errors made with conviction: of the 52 made with more than 90% confidence, it flags 20.',
          ],
          figures: [
            ['texto_camadas', 'Customer messages in Fannar’s space at three DistilBERT blocks, colored by predicted intent'],
            ['texto_palavras', 'The weight of each word in one message according to Fannar, SHAP, and LIME'],
            ['texto_ortogonal', 'How well orthogonal energy anticipates errors at each block, next to the model’s confidence, and how many confident errors it flags'],
          ],
        },
        {
          id: 'series',
          model: '1D CNN',
          data: 'Motor vibration (synthetic signals)',
          title: 'Where is the fault in the signal?',
          body: 'A convolutional network recognizes four motor states from vibration, with 99.8% accuracy. For the bearing fault, the question is which instants the model relies on.',
          findings: [
            'The bearing impacts cover 15% of the time. 66% of Fannar’s map falls on them, 57% of LIME’s, and 48% of SHAP’s.',
            'All three concentrate on the impacts far above what chance would give: the model uses the right symptom.',
          ],
          figures: [
            ['series_falha', 'Vibration signal with the fault impacts marked and, below, where each method points in time'],
          ],
        },
      ],
    },
    scope: {
      title: 'Examples, not promises',
      body: 'These models were trained to illustrate the method, with one run each. In a project, every reading is compared with a reference, and the report says when a result does not hold. Two results were left off this page on purpose: on trees, SHAP flips the decision with as few swaps as Fannar or fewer, and on a LightGBM model the geometry did not anticipate the errors.',
    },
  },

  es: {
    meta: {
      title: 'Fannar · Método, ejemplos y resultados',
      description: 'Cómo Fannar interpreta modelos de IA, cómo trabaja junto con SHAP y LIME, y seis modelos interpretados: XGBoost, Random Forest, una red neuronal, ResNet, DistilBERT y una CNN para series temporales.',
    },
    hero: {
      title: 'Fannar mira dentro del modelo.',
      lead: 'Reúne lo que el modelo calcula por dentro, como activaciones, gradientes, parámetros o, en árboles, los caminos de decisión, en un único espacio geométrico, y lee ese espacio capa a capa. En esta página: cómo funciona el método, cómo trabaja junto con SHAP y LIME y qué encontró en seis modelos.',
      primary: 'Ver los casos',
      secondary: 'Cómo funciona',
      figureTitle: 'Una matriz por fuente, un espacio conjunto',
      figureSources: ['activaciones', 'gradientes', 'parámetros'],
      figureResult: 'espacio de representación G',
      figureCaption: 'Las muestras de la misma clase forman bloques de alta similitud. El producto de Hadamard conserva solo aquello en lo que las tres fuentes coinciden.',
    },
    method: {
      title: 'Varias fuentes del modelo, un único espacio geométrico',
      lead: 'Fannar es un método post hoc e independiente de la arquitectura. No entrena un modelo sustituto. Trabaja sobre lo que el propio modelo ya calcula.',
      steps: [
        ['Extraer las fuentes', 'Para cada muestra, las activaciones de cada capa, el gradiente de la decisión y los filtros que activó. En árboles y ensembles, el camino, la holgura y las hojas alcanzadas.'],
        ['Medir la similitud', 'Cada fuente se convierte en una matriz de Gram mediante un núcleo definido positivo, con normalización angular, la elección que más pesa en el resultado.'],
        ['Componer las fuentes', 'El producto de Hadamard combina las matrices en un único espacio. Por el teorema de Schur, el resultado sigue siendo semidefinido positivo.'],
        ['Leer el espacio', 'Distancias, vecindarios, energía espectral y conjuntos de nivel, siempre comparados con la misma red antes del entrenamiento.'],
      ],
      floorTitle: 'El piso de cada lectura',
      floorBody: 'Cada lectura se compara con la misma arquitectura con sus pesos iniciales. La única diferencia entre la lectura y su piso es el entrenamiento, así que lo que se aleja del piso lo aprendió el modelo.',
    },
    methods: {
      title: 'Tres lecturas, un informe',
      lead: 'Ningún método de interpretabilidad lo responde todo solo. Cada informe combina tres, y cada uno aporta lo que mejor mide.',
      items: [
        ['Fannar', 'Mira dentro del modelo', 'La geometría de cada capa, los errores cometidos con convicción, lo que cambia entre versiones y dónde, en la entrada, se concentra la representación.'],
        ['SHAP', 'Reparte la salida entre las entradas', 'Cuánto empujó cada atributo la predicción. En árboles, TreeSHAP es exacto y sirve de referencia fuerte.'],
        ['LIME', 'Aproxima el modelo alrededor de un caso', 'Un modelo simple y local, fácil de comunicar e independiente de la arquitectura.'],
      ],
      note: 'Donde los tres coinciden, la conclusión es más firme. Donde divergen, hay algo que investigar. Donde solo Fannar mide, aparece solo.',
    },
    cases: {
      title: 'Seis modelos, seis preguntas',
      lead: 'Modelos entrenados para esta página con datos públicos o sintéticos, para mostrar el tipo de resultado que entrega un informe. Cada caso se ejecutó una vez; la evaluación sistemática del método está en el artículo.',
      model: 'Modelo',
      data: 'Datos',
      open: 'Abrir la figura a tamaño real',
      only: 'Solo Fannar',
      items: [
        {
          id: 'credito',
          model: 'XGBoost · Random Forest',
          data: 'Crédito (HELOC, FICO)',
          title: '¿Por qué un cliente fue rechazado y otro aprobado?',
          body: 'Dos clientes parecidos recibieron decisiones opuestas: 30% de probabilidad de aprobación para A y 82% para B. La explicación muestra, atributo por atributo, qué los separa y cuánto pesa cada diferencia.',
          findings: [
            'Los tres métodos coinciden en tres motivos: consultas de crédito en los últimos 6 meses, uso del crédito rotativo y antigüedad media de las cuentas.',
            'En el orden de Fannar, copiar de B un solo atributo, los meses desde la última consulta, ya lleva a A por encima del umbral de aprobación. En los tres órdenes, bastan dos atributos.',
            'En el Random Forest, de otra familia, los tres métodos también convergen, pero en otros motivos, como la puntuación de riesgo externa: cada modelo tiene sus propias razones, y la explicación debe hacerse para el modelo que está en producción.',
          ],
          figures: [
            ['credito_par', 'Dos clientes lado a lado, con la probabilidad de aprobación de cada uno y los atributos que más los separan'],
            ['credito_tres_metodos', 'Los cinco atributos que más separan a los dos clientes según Fannar, SHAP y LIME, con los comunes unidos'],
            ['credito_contrafactual', 'Probabilidad de aprobación de A a medida que recibe los valores de B, en el orden de cada método'],
            ['credito_tres_metodos_rf', 'La misma comparación de los tres métodos en el Random Forest'],
          ],
        },
        {
          id: 'churn',
          model: 'Red neuronal (MLP)',
          data: 'Abandono de clientes de telecomunicaciones',
          title: '¿Dónde revisar primero?',
          body: 'El modelo acierta el 89% de los clientes, pero la mayoría de sus errores llegan con mucha confianza, y la confianza del modelo no los delata. Fannar mide otra cosa: qué tan cerca está cada cliente de la frontera entre quedarse y darse de baja.',
          findings: [
            '113 de los 136 errores se cometieron con más del 90% de confianza. Fannar señala 55 de ellos entre los casos más dudosos.',
            'Revisando el 20% de clientes más dudosos según Fannar, se encuentra el 57% de los errores. La confianza del modelo y Fannar se complementan como cola de revisión.',
            'Para explicar por qué un cliente se va y otro parecido se queda, los tres métodos señalan los minutos de día y de tarde.',
          ],
          figures: [
            ['churn_erros_confiantes', 'Los 136 errores del modelo: la mayoría con más del 90% de confianza, y cuántos señala Fannar'],
            ['churn_fila_revisao', 'Errores encontrados al revisar primero los casos más dudosos, según la confianza del modelo, Fannar y ambos juntos'],
            ['churn_tres_metodos', 'Los atributos que más separan a un cliente que se va de uno parecido que se queda, según Fannar, SHAP y LIME'],
          ],
        },
        {
          id: 'versoes',
          model: 'Dos versiones de la misma red',
          data: 'Abandono de clientes de telecomunicaciones',
          title: '¿El reentrenamiento cambió el modelo?',
          body: 'Dos versiones con la misma exactitud, 89,1% y 88,9%, entrenadas con muestras distintas de los datos. La métrica no cambia, pero el modelo por dentro sí.',
          findings: [
            'Las capas más profundas de las dos versiones se parecen poco: un alineamiento de 0,58 a 0,60, en una escala de 0 a 1.',
            'El 7,6% de los clientes cambia de predicción de una versión a otra.',
            'Quienes cambian estaban cerca de la frontera: su margen mediano es 0,34, frente a 0,59 en general.',
          ],
          only: 'SHAP y LIME explican una versión cada vez; comparar el interior de dos versiones es una lectura que solo hace Fannar.',
          figures: [
            ['versoes_cka', 'Alineamiento entre las capas de las dos versiones y el margen de los clientes que cambian de predicción'],
          ],
        },
        {
          id: 'visao',
          model: 'ResNet-18',
          data: 'Fotos de gatos y perros (Oxford-IIIT Pet)',
          title: '¿El modelo aprendió el gato o la marca de agua?',
          body: 'Uno de los modelos se entrenó con una pequeña marca en el 95% de las fotos de perros y aprendió el atajo: llama perro al 40% de los gatos con la marca, frente al 3% del modelo entrenado con fotos limpias. Las dos versiones tienen exactitud alta en la prueba.',
          findings: [
            'En el modelo con atajo, el 50% del mapa de Fannar cae sobre la marca, que ocupa el 2% de la imagen. En LIME es el 20%; en SHAP, el 7%.',
            'Los tres métodos dan a la marca más peso del que justificaría su área, lo que confirma el diagnóstico.',
            'En el modelo limpio, el 91% del mapa de Fannar queda sobre el animal.',
            'La energía ortogonal de Fannar muestra el otro lado: en el modelo con atajo, el 68% de ella queda en el animal. El atajo tomó la estructura dominante, pero el gato sigue representado fuera de ella.',
          ],
          figures: [
            ['visao_atalho', 'La misma foto de gato con una marca en la esquina, vista por los dos modelos y por los tres métodos'],
            ['visao_onde_olha', 'Parte de cada mapa que cae sobre la marca y sobre el animal, en 120 fotos de gatos'],
            ['visao_energias', 'Energía retenida y energía ortogonal de cada posición de la imagen, en los dos modelos'],
          ],
        },
        {
          id: 'texto',
          model: 'DistilBERT (transformer)',
          data: 'Mensajes de clientes de banco (Banking77)',
          title: '¿Cómo separa el transformer las intenciones?',
          body: 'Un transformer ajustado para clasificar ocho intenciones de clientes de un banco, con 96% de exactitud. Fannar muestra la separación ocurriendo bloque a bloque; los tres métodos muestran qué pesó en un mensaje.',
          findings: [
            'Tras el ajuste fino, entre el 94% y el 98% de los vecinos de cada mensaje tienen su misma predicción, frente al 63% a 78% en el modelo original.',
            'En “I still have not received my new card”, los tres métodos destacan “card”, y Fannar destaca también “received”.',
            'La energía ortogonal de Fannar anticipa los errores cada vez mejor a lo largo de los bloques, muy por encima del modelo original. La confianza del propio modelo los anticipa mejor; Fannar añade los errores cometidos con convicción: de los 52 con más del 90% de confianza, señala 20.',
          ],
          figures: [
            ['texto_camadas', 'Mensajes de clientes en el espacio de Fannar en tres bloques de DistilBERT, coloreados por la intención prevista'],
            ['texto_palavras', 'El peso de cada palabra de un mensaje según Fannar, SHAP y LIME'],
            ['texto_ortogonal', 'Cuánto anticipa los errores la energía ortogonal en cada bloque, junto a la confianza del modelo, y cuántos errores confiados señala'],
          ],
        },
        {
          id: 'series',
          model: 'CNN 1D',
          data: 'Vibración de motor (señales sintéticas)',
          title: '¿Dónde está la falla en la señal?',
          body: 'Una red convolucional reconoce cuatro estados de un motor a partir de la vibración, con 99,8% de exactitud. En la falla de rodamiento, la pregunta es en qué instantes se apoya el modelo.',
          findings: [
            'Los impactos del rodamiento ocupan el 15% del tiempo. Sobre ellos cae el 66% del mapa de Fannar, el 57% del de LIME y el 48% del de SHAP.',
            'Los tres concentran la atención en los impactos muy por encima de lo que daría el azar: el modelo usa el síntoma correcto.',
          ],
          figures: [
            ['series_falha', 'Señal de vibración con los impactos de la falla marcados y, debajo, hacia dónde apunta cada método en el tiempo'],
          ],
        },
      ],
    },
    scope: {
      title: 'Ejemplos, no promesas',
      body: 'Estos modelos se entrenaron para ilustrar el método, con una ejecución cada uno. En un proyecto, cada lectura se compara con una referencia y el informe dice cuándo un resultado no se sostiene. Dos resultados quedaron fuera de esta página a propósito: en árboles, SHAP cambia la decisión con tantos intercambios como Fannar o menos, y en un modelo LightGBM la geometría no anticipó los errores.',
    },
  },
};
