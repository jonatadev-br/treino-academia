# Treino Força — PWA offline-first + APK Android assinado

Aplicativo de registro e acompanhamento de treinos de força, em português do Brasil, mobile-first,
100% funcional sem internet após o primeiro carregamento. Inclui a versão Android (Capacitor) em
release assinado.

---

## 1. Confirmação obrigatória (respondida antes do código)

**1. Ambiente com Java 17, Android SDK (build-tools + platform-tools) e Gradle?**
**SIM.** O ambiente de build foi preparado e usado de fato:

- JDK 17 — Eclipse Temurin 17.0.21+9
- Android SDK — platform-tools, `platforms;android-34`, `build-tools;34.0.0`
- Gradle 8.2.1 (via Gradle Wrapper do projeto, AGP 8.2.1)

**2. Keystore gerada, APK assinado em release e arquivo binário disponibilizado para download?**
**SIM.** A keystore foi gerada com `keytool`, o APK foi compilado em `release` (R8 + minify +
shrinkResources), assinado com **v1 + v2 + v3** e está disponível como arquivo baixável nesta
conversa (pasta de arquivos) e no filesystem do projeto.

Arquivo no filesystem deste ambiente:
`/workspace/chats/f45700a6ea705893d2a4f0b4/files/treino-forca-v1.0.0-release.apk`

---

## 2. APK assinado (entregável principal)

| Item | Valor |
|---|---|
| Arquivo | `files/treino-forca-v1.0.0-release.apk` |
| Tamanho | 1,3 MB |
| Pacote | `com.treinoforca.app` |
| versionCode | `1` |
| versionName | `1.0.0` |
| minSdk / targetSdk | 22 (Android 5.1+) / 34 (Android 14) |
| Build | `release` com `minifyEnabled true` + `shrinkResources true` (R8) |
| Assinatura | v1 (JAR) ✅ · v2 ✅ · v3 ✅ |
| SHA-256 do APK | `95a01b47e5165279f2e73a7eccc6f478b2f07507e70e80bf4b4e804bf7da6d5c` |

**O APK assinado é produzido por `build-apk.sh`, comando exato: `./build-apk.sh`.**
O arquivo entregue foi gerado executando exatamente esse comando neste ambiente (saída ao final:
`dist/treino-forca-v1.0.0-release.apk`, SHA-256 acima).

### Downloads desta entrega

- APK: `files/treino-forca-v1.0.0-release.apk`
- Keystore: `files/treino-forca-release.jks`
- Verificação completa: `files/apksigner-verify.txt`
- SHA-256: `files/treino-forca-v1.0.0-release.apk.sha256`

---

## 3. Instalar no celular

1. Envie o APK para o celular (cabo USB, Google Drive, WhatsApp como documento ou e-mail).
2. Toque no arquivo `treino-forca-v1.0.0-release.apk`.
3. O Android vai pedir para permitir instalação de fontes desconhecidas:
   **Configurações → Apps → Acesso especial → Instalar apps desconhecidos** →
   escolha o app por onde abriu (Arquivos/Chrome/WhatsApp) → **Permitir**.
4. Toque em **Instalar** e depois em **Abrir**.
5. Se o Play Protect avisar que não reconhece o app, escolha **Instalar assim mesmo**
   (é normal para APK assinado fora da Play Store).

Via computador com ADB (opcional):

```bash
adb install -r files/treino-forca-v1.0.0-release.apk
```

> O app não pede login. Todos os dados ficam no próprio celular. Antes de desinstalar, use
> **Config → Exportar JSON** para guardar o histórico.

---

## 4. Keystore e credenciais

> **Guarde estes dados.** Sem a mesma keystore e senhas, uma atualização futura só instala se o
> app antigo for desinstalado (e o histórico local será perdido sem backup). Não publique este
> arquivo nem as senhas em repositório público.

| Item | Valor |
|---|---|
| Arquivo | `keystore/treino-forca-release.jks` (cópia em `files/treino-forca-release.jks`) |
| Alias | `treino-forca` |
| Senha do keystore | `SUA_SENHA_AQUI` |
| Senha da chave | `SUA_SENHA_AQUI` |
| Validade | 10.000 dias (até 02/04/2054) |
| DN | `CN=Treino Forca, OU=Mobile, O=Treino Forca, L=Sao Paulo, ST=SP, C=BR` |
| Certificado SHA-256 | `E2:20:68:DF:95:6A:AD:84:B4:F8:86:4F:E7:48:A3:9B:FC:3E:38:3E:2B:58:18:7E:8E:B0:3C:F7:A2:72:6F:1B` |

Comando `keytool` exato usado para gerar:

```bash
keytool -genkeypair -v \
  -keystore keystore/treino-forca-release.jks \
  -alias treino-forca \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass SUA_SENHA_AQUI -keypass SUA_SENHA_AQUI \
  -dname "CN=Treino Forca, OU=Mobile, O=Treino Forca, L=Sao Paulo, ST=SP, C=BR"
```

Para trocar as senhas depois:

```bash
keytool -storepasswd -keystore keystore/treino-forca-release.jks
keytool -keypasswd -alias treino-forca -keystore keystore/treino-forca-release.jks
```

Depois atualize `android/key.properties` (ou as variáveis `STORE_PASS` / `KEY_PASS` do
`build-apk.sh`) e os secrets do GitHub Actions.

---

## 5. Rodar a versão PWA localmente

Requisitos: Node.js 18+ (só para o Capacitor) e Python 3 (servidor estático) — ou qualquer
servidor HTTP.

```bash
npm install
npm run serve
# abre em http://localhost:4173
```

Alternativa sem npm:

```bash
python3 -m http.server 4173 --directory www
```

> Não abra o `index.html` direto via `file://`: o Service Worker e o manifest precisam de
> `http://localhost` ou HTTPS.

### Instalar como PWA

1. Abra no Chrome (Android) ou Edge/Chrome no desktop.
2. Use o botão **Instalar app** no topo do app ou o menu do navegador →
   **Instalar app / Adicionar à tela inicial**.
3. Depois do primeiro carregamento, ative o **modo avião** e abra o app: ele carrega e funciona
   normalmente.

No iPhone (Safari): **Compartilhar → Adicionar à Tela de Início**.

---

## 6. Gerar o APK assinado

### Caminho A — local, um comando (usado nesta entrega)

```bash
./build-apk.sh
```

O script:

1. valida Java 17, Android SDK, `zipalign` e `apksigner`;
2. reaproveita a keystore/credenciais existentes (ou gera uma nova);
3. instala dependências e roda `npx cap sync android`;
4. compila `assembleRelease` com R8, minify e shrinkResources;
5. roda `zipalign -p 4`;
6. assina com `apksigner` usando **v1 + v2 + v3**;
7. verifica a assinatura, calcula o SHA-256 e imprime caminho + hash.

Saída desta execução:

```text
APK assinado com sucesso.
  Arquivo : /workspace/chats/f45700a6ea705893d2a4f0b4/dist/treino-forca-v1.0.0-release.apk
  Tamanho : 1.3M
  Versão  : 1.0.0 (versionCode 1)
  SHA-256 : 95a01b47e5165279f2e73a7eccc6f478b2f07507e70e80bf4b4e804bf7da6d5c
  Keystore: /workspace/chats/f45700a6ea705893d2a4f0b4/keystore/treino-forca-release.jks
  Alias   : treino-forca

Instale no celular com: adb install -r "/workspace/chats/f45700a6ea705893d2a4f0b4/dist/treino-forca-v1.0.0-release.apk"
```

### Caminho B — GitHub Actions (compila e assina automaticamente)

Workflow: `.github/workflows/android.yml`
Gatilhos: push de tag `v*` ou execução manual (`workflow_dispatch`).

1. Crie um repositório no GitHub e envie o projeto.
2. Em **Settings → Secrets and variables → Actions**, crie:

| Secret | Conteúdo |
|---|---|
| `KEYSTORE_BASE64` | keystore `.jks` convertida para base64 |
| `KEYSTORE_PASSWORD` | `SUA_SENHA_AQUI` (ou a senha nova) |
| `KEY_PASSWORD` | `SUA_SENHA_AQUI` (ou a senha nova) |
| `KEY_ALIAS` | `treino-forca` |

Gerar o base64:

```bash
# Linux
base64 -w0 keystore/treino-forca-release.jks > keystore.b64
# macOS
base64 -i keystore/treino-forca-release.jks -o keystore.b64
```

3. Rode o workflow em **Actions → Android Release APK → Run workflow**, ou crie uma tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

4. O APK assinado fica em **Actions → execução → Artifacts →
`treino-forca-apk-assinado`**. Em pushes de tag, ele também é anexado ao **Release** do GitHub,
junto com o arquivo `.sha256`.

O workflow usa os mesmos passos do script: release com R8, zipalign e `apksigner` com
`--v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true`.

---

## 7. Verificação da assinatura

Comando executado:

```bash
apksigner verify --verbose --print-certs dist/treino-forca-v1.0.0-release.apk
```

Resumo:

```text
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v4 scheme (APK Signature Scheme v4): false
Number of signers: 1
Signer #1 certificate DN: CN=Treino Forca, OU=Mobile, O=Treino Forca, L=Sao Paulo, ST=SP, C=BR
Signer #1 certificate SHA-256 digest: e22068df956aad84b4f8864fe748a39bfc3e383e2b58187e8eb03cf7a2726f1b
Signer #1 key algorithm: RSA
Signer #1 key size (bits): 2048
```

Saída completa (inclui os avisos de entradas `META-INF/*.version`, que não afetam a assinatura):

<details>
<summary>Clique para ver a saída completa do apksigner</summary>

```text
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v4 scheme (APK Signature Scheme v4): false
Verified for SourceStamp: false
Number of signers: 1
Signer #1 certificate DN: CN=Treino Forca, OU=Mobile, O=Treino Forca, L=Sao Paulo, ST=SP, C=BR
Signer #1 certificate SHA-256 digest: e22068df956aad84b4f8864fe748a39bfc3e383e2b58187e8eb03cf7a2726f1b
Signer #1 certificate SHA-1 digest: a367b3e8c494910d5ab48d72dd999325ecdcbbba
Signer #1 certificate MD5 digest: 04ea687e6134f179dba11e01e6edeb36
Signer #1 key algorithm: RSA
Signer #1 key size (bits): 2048
Signer #1 public key SHA-256 digest: 0e9b7e460d2bb9f70094c2b937397f10c66bda628fe8ca48a0bbd8fcd1f38149
Signer #1 public key SHA-1 digest: bc35e5388c0acc32bba8fb43e0be3bf34b99f43b
Signer #1 public key MD5 digest: 37f3b8773d6570cf07d5d8c8680a8cd7
WARNING: META-INF/com/android/build/gradle/app-metadata.properties not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.activity_activity.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.annotation_annotation-experimental.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.appcompat_appcompat-resources.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.appcompat_appcompat.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.arch.core_core-runtime.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.coordinatorlayout_coordinatorlayout.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.core_core-ktx.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.core_core-splashscreen.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.core_core.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.cursoradapter_cursoradapter.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.customview_customview.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.drawerlayout_drawerlayout.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.emoji2_emoji2-views-helper.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.emoji2_emoji2.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.fragment_fragment.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.interpolator_interpolator.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-livedata-core.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-livedata.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-process.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-runtime.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-viewmodel-savedstate.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.lifecycle_lifecycle-viewmodel.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.loader_loader.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.profileinstaller_profileinstaller.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.savedstate_savedstate.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.startup_startup-runtime.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.tracing_tracing.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.vectordrawable_vectordrawable-animated.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.vectordrawable_vectordrawable.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.versionedparcelable_versionedparcelable.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.viewpager_viewpager.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/androidx.webkit_webkit.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/kotlinx_coroutines_android.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
WARNING: META-INF/kotlinx_coroutines_core.version not protected by signature. Unauthorized modifications to this JAR entry will not be detected. Delete or move the entry outside of META-INF/.
```

</details>

Metadados do APK (`aapt dump badging`):

```text
package: name='com.treinoforca.app' versionCode='1' versionName='1.0.0'
sdkVersion:'22'
targetSdkVersion:'34'
application-label:'Treino Força'
```

---

## 8. Funcionalidades

### Dashboard
- Próximo treino sugerido pela **sequência** do ciclo (Push → Pull → Legs), com atalho de início.
- **Iniciar outro treino:** escolha livre de qualquer template (inclusive o Reforço opcional), sem depender do dia da semana.
- Treino em andamento com progresso.
- Treinos da semana, volume semanal e sessões salvas.
- Alerta de deload quando a regra é acionada.
- Gráfico de carga (top set) nos exercícios básicos.
- Histórico resumido dos últimos treinos.

### Treino
- Início pelo treino sugerido no ciclo ou por qualquer template da lista.
- Registro por série: **peso, reps, RIR (0–4+), nota opcional e data/hora**; série salva na hora.
- Timer de descanso automático: **2:30 nos básicos** e **1:15 nos acessórios**, com
  iniciar/pausar/continuar, +15 s, zerar e **X sempre visível no canto direito**. Em telas
  estreitas, o nome longo é truncado com reticências e os controles quebram para uma segunda
  linha sem esconder o botão de fechar.
- Back-off automático: ao salvar o top set, a série 2 é preenchida com ~90% da carga.
- Sugestões de próxima carga, concluir exercício, concluir treino, observações e cardio.
- **Referência do último treino:** abaixo da sugestão, mostra a série 1 (top set) mais recente
  do exercício, no formato `Último treino: 40 kg × 5 reps (RIR 2)`. Se ainda não há histórico,
  a mensagem “Primeira vez...” continua aparecendo sozinha.
- Sessão em andamento fica salva: fecha o app e continua de onde parou.
- **Sexta — Reforço + Hipertrofia (opcional):** 8 exercícios na versão completa, com versão enxuta descrita na Ajuda; tag **OPCIONAL** visível, sem cargas máximas e sem contar como dia obrigatório do PPL. O Reforço não avança o ciclo.
- Editar/adicionar/remover/reordenar exercícios; CRUD de templates e “Restaurar padrão”.

### Guia de execução e dicas
- Botão **i** (40 × 40 px) ao lado do nome de cada exercício na sessão ativa.
- Modal com nome, **SVG animado local**, 3–4 dicas em tópicos e botão **Fechar**.
- 7 ilustrações em `www/assets/exercicios/`: supino, agachamento, levantamento terra,
  desenvolvimento militar, remada, barra fixa e uma genérica para acessórios.
- As animações usam CSS keyframes dentro do próprio SVG: **zero internet, zero CDN**,
  carregamento instantâneo e funcionamento em modo avião.
- Dicas padrão para os básicos (supino, agachamento, terra, OHP, remada e barra fixa),
  além de agachamento leve e Romanian deadlift; acessórios recebem dicas genéricas de
  controle de movimento e respiração.
- Dicas **editáveis** em Treino → Editar treinos (uma por linha), salvas no template e
  copiadas para a sessão; também entram no backup JSON.

### Histórico
- Lista por data (mais recente primeiro), filtro por treino (Push/Pull/Legs/Reforço) e detalhe de cada sessão.
- **+ Treino passado:** escolha o template e uma data retroativa (nunca futura) para registrar um treino esquecido;
  as séries são salvas normalmente e a lista é reordenada por data.
- Exclusão de treino com confirmação.

### Progresso
- Gráfico de carga nos básicos.
- Volume semanal (8 semanas) e frequência semanal.
- PRs (melhor carga e 1RM estimado por Epley).
- Sugestões de próximas cargas por exercício.
- Alertas de deload com carga sugerida (−10%).

### Ajuda / Glossário (pesquisável)
- RIR, Deload, Básico vs. Acessório, Top set e Back-off, Dupla progressão, Descanso, LISS e PR/1RM.
- Tooltips “?” em RIR, Deload, Básico/Acessório, Top set, Back-off, Dupla progressão.

### Onboarding
- 4 telas na primeira abertura: Básico vs. Acessório, RIR, Top set/Back-off, Deload — com “Pular”.
- Pode ser revisto em Ajuda ou Config.

### Config
- Peso corporal e unidade (kg/lb). Ao mudar o peso, a meta de proteína é recalculada para
  **2 g/kg** (ex.: 65 kg → 130 g), mas o campo continua editável (40–300 g). A faixa indicada
  é **1,6–2,2 g/kg** (65 kg → 104–143 g/dia).
- Calculadora de calorias com Mifflin-St Jeor (26 anos, 1,71 m, masculino), nível de atividade
  (sedentário, levemente ativo, moderadamente ativo), superávit de 200–300 kcal e total diário.
- Exportar/importar JSON, restaurar treinos padrão, apagar dados.
- Botão “Instalar app” via `beforeinstallprompt` (PWA) e instruções quando não disponível.

### Offline-first
- `manifest.json` completo (ícones 192/512 + maskable, standalone, portrait).
- Service Worker cache-first com pré-cache de todos os assets e fallback de navegação.
- Dados em `localStorage`, chave **`treinoForcaApp`**. Sem backend, sem login.
- **Zero CDN**: nenhuma biblioteca externa; gráficos desenhados em Canvas puro;
  ícones, SVGs do guia e fontes locais (fonte do sistema).
- Os SVGs do guia entram no pré-cache do Service Worker e viajam dentro do APK.

---

## 9. Regras de negócio implementadas

**Progressão (dupla progressão)**
- **Básicos:** série 1 = top set (3–5 reps, RIR 1–2); série 2 = back-off ~90% (5–6 reps).
  Se o top set bater o topo da faixa com RIR ≥ 2 → sugere **+2,5 kg (superior)** ou
  **+5 kg (inferior)**. O back-off é recalculado sobre a nova carga.
- **Acessórios:** se as 2 séries baterem o topo da faixa → sugere subir o peso pelo mesmo
  incremento (superior +2,5 kg / inferior +5 kg).
- A lógica está comentada em `www/app.js` (`nextLoadAdvice`, `liveAdvice`).

**Deload**
- O app olha os **2 últimos treinos em que o exercício foi registrado**. Se em ambos o top set
  ficou abaixo do topo da faixa (com carga > 0), dispara o alerta com sugestão de **−10%** por
  uma semana e link para o glossário. Implementação comentada em `deloadAlerts()`.

**Sexta — Reforço + Hipertrofia**
- Dia de reforço, não de força máxima. O template padrão traz agachamento leve (2×5 a ~80% da
  carga de quinta, tratado como acessório técnico: as duas séries usam a mesma carga, sem top
  set/back-off), remada, elevação lateral, rosca, tríceps, flexora, core e panturrilha sentado,
  com 20–30 min de LISS ou HIIT curto.
- O agachamento leve é marcado como **técnico** (`progress: false`): o app repete a carga e não
  sugere +5 kg. Os demais extras usam dupla progressão normal (sobem ao bater o topo da faixa
  nas 2 séries).
- A versão enxuta (agachamento leve + remada + elevação lateral + tríceps + core) está na Ajuda;
  para usá-la, edite a sexta e remova rosca e flexora. O Reforço não conta como dia obrigatório:
  sendo opcional, ele não avança o ciclo.

**Ciclo por sequência (sem dia da semana)**
- O próximo treino vem do **último treino do ciclo registrado no histórico**, e não do dia da
  semana. Fez Legs numa segunda e não treinou na quinta? Na terça (ou quando voltar) o app
  sugere **Push**. Pular dias nunca trava o app num treino específico.
- A ordem vem do campo `day` dos templates não opcionais (Push, Pull, Legs). Reforço e templates
  criados como **extra** não entram na sequência e não a fazem avançar.
- O vínculo do treino salvo com o ciclo usa `templateId` e, se o template tiver sido recriado,
  o título como reserva. Treino de template excluído é ignorado no cálculo.
- Treinos retroativos entram na posição cronológica correta e também não alteram a sugestão se
  forem mais antigos que o último treino do ciclo.
- A duração é medida pelo relógio real (`realStartedAt`), com teto de 6 h, para que um treino
  lançado com data passada não gere minutos absurdos.

**Timer**
- Básicos 150 s; acessórios 75 s. Ao salvar uma série, o timer inicia sozinho com o nome do
  exercício; vibra quando termina (quando suportado).
- Layout responsivo: o **X** fica sempre visível no canto direito; em telas ≤420 px o nome é
  truncado com reticências e os controles ocupam uma segunda linha, sem overflow horizontal.

**Unidades**
- Pesos são armazenados em kg. A interface converte para lb quando selecionado, inclusive
  gráficos, histórico e sugestões.

---

## 10. Estrutura do projeto

```text
.
├── www/                          # PWA (webDir do Capacitor)
│   ├── index.html
│   ├── styles.css
│   ├── app.js                    # toda a lógica, comentada em português
│   ├── manifest.json
│   ├── sw.js
│   └── icons/                    # 192, 512, maskable 192/512, apple-touch
├── capacitor.config.json         # appId, appName, webDir
├── package.json / package-lock.json
├── android/                      # projeto Android gerado pelo Capacitor
│   ├── app/build.gradle          # release com R8 + signingConfig
│   ├── app/proguard-rules.pro    # regras do Capacitor
│   ├── key.properties            # credenciais locais (não versionar)
│   ├── variables.gradle          # compileSdk 34 / targetSdk 34 / minSdk 22
│   └── ...
├── keystore/
│   └── treino-forca-release.jks
├── build-apk.sh                  # build + assinatura em um comando
├── .github/workflows/android.yml # CI: release assinado + artifact + GitHub Release
├── dist/                         # APK gerado (ignorado pelo git)
└── README.md
```

---

## 11. Testes executados nesta entrega

- **Build:** `./gradlew assembleRelease` concluído com sucesso (112 tarefas, R8 + shrinkResources).
- **Assinatura:** `apksigner verify --verbose --print-certs` → v1, v2 e v3 válidos.
- **Metadados:** `aapt dump badging` → pacote, versão 1.0.0 (code 1), minSdk 22, target 34.
- **Navegador (Chromium, viewport mobile):**
  - onboarding aparece na primeira abertura, 4 telas, “Pular” e “Começar” funcionam;
  - início do Push, registro de série 40 kg × 5 @RIR 2, timer 02:30 e back-off automático 36 kg;
  - conclusão do treino, histórico com volume (200 kg) e persistência após recarregar;
  - modo offline (contexto offline) após o primeiro load: app abriu pelo Service Worker, com
    Configurações, proteína/calorias e timer disponíveis;
  - progressão: 40 kg × 5 @RIR 2 → sugestão de 42,5 kg e back-off 38,5 kg;
  - deload: dois treinos com 4 reps na faixa 3–5 → alerta e sugestão de 36 kg (−10%);
  - glossário pesquisável, tooltip “Dupla progressão”, troca kg/lb;
  - proteína automática: 65 kg → 130 g e faixa 104–143 g/dia; valor manual (150 g) preservado
    até mudar o peso, quando volta para 2 g/kg (70 kg → 140 g);
  - calorias: 65 kg/levemente ativo → 2.441 kcal/dia; sedentário → 2.163; moderado → 2.720;
    BMR 1.594 e TDEE 2.191, com superávit de +250 kcal;
  - timer com nome longo em 320/360/390 px: X visível, nome truncado com reticências e sem
    overflow horizontal; +15 s, pausa/continuar e fechar testados;
  - último treino: Supino 40 kg × 5 @RIR 2 exibido como “Último treino: 40 kg × 5 reps (RIR 2)”,
    persistido após recarregar; exercício sem histórico mantém “Primeira vez...”;
  - nota por série gravada (`TESTE_NOTA_123`) e exibida no detalhe do histórico;
  - tooltips de RIR, top set e back-off abrem o modal com explicação;
  - template de sexta com 7 exercícios, tag opcional e agachamento leve sem sugestão de +5 kg;
  - correção do teclado: foco e valor preservados ao simular o resize do teclado em Configurações,
    notas do treino, editor e busca; trocar de campo nas Configurações não fecha mais o teclado;
  - templates vazios permanecem vazios após recarregar (não voltam sozinhos ao padrão);
  - guia de execução aberto e fechado nos 22 exercícios dos 4 templates, com SVG local
    carregado e 4 dicas em cada; botão de 40 × 40 px;
  - animação CSS confirmada (frames diferentes e `@keyframes press` de 2,8 s);
  - dicas personalizadas salvas, exibidas no guia e persistidas após recarregar; backup
    importado com as dicas;
  - timers 2:30 e 1:15, RIR 2 salvo, progressão para 42,5 kg e deload de 72 kg confirmados;
  - modo avião: app abriu pelo Service Worker, guia e SVG carregaram do cache;
  - exportação JSON: arquivo válido de 20.707 bytes, 4 templates, 1 sessão e dicas;
  - nenhum erro de console ou de página durante os fluxos.
- **Não executado:** instalação em aparelho Android físico/emulador (não há dispositivo neste
  ambiente) e revisão visual do APK no celular. O APK foi validado por build, assinatura e
  conteúdo; recomendo abrir e fazer um treino de teste após instalar.

---

### Ciclo por sequência e treino retroativo (revisão)
- `node --check www/app.js` sem erros.
- Teste de lógica em Node (VM com DOM mínimo) cobrindo: ordem do ciclo Push → Pull → Legs;
  Legs feito na segunda → próxima sugestão Push; treino concluído hoje → sugestão "amanhã";
  Pull → Legs; Reforço e treino extra não avançam o ciclo; template excluído é ignorado.
- Treino retroativo: data escolhida vai para `date`/`startedAt`, título do template é mantido,
  séries de Legs somam volume nos exercícios de perna e a duração reflete o tempo real de
  registro; datas futuras são rejeitadas (campo `max` no modal e comparação em `startSession`).
- Histórico: ordenação por data decrescente após salvar, importar e carregar o estado;
  exclusão preserva a ordem; "último treino" e alertas de deload continuam usando o treino
  mais recente do exercício.
- **Não revisado visualmente:** layout do card "Iniciar outro treino", do botão "+ Treino
  passado" e do campo de data no painel do navegador.

## 12. Observações e limitações

- O APK é universal (sem splits por ABI), por isso tem apenas ~1,3 MB.
- O app declara a permissão `INTERNET` (padrão do Capacitor), mas não faz requisições de rede;
  os dados são locais.
- Os avisos do `apksigner` sobre `META-INF/*.version` são informativos: esses arquivos de
  metadados do AndroidX não entram na assinatura JAR v1, mas o APK está protegido por v2/v3.
- Se você trocar a keystore, o Android tratará como outro app: é preciso desinstalar a versão
  anterior (faça backup antes).
- O Service Worker é desativado dentro do APK de propósito (os assets já são locais), evitando
  cache antigo entre atualizações. Na versão PWA, ao publicar uma nova versão incremente
  `CACHE_VERSION` em `www/sw.js` para forçar a atualização do cache.
- Metas de proteína/calorias são referências de apoio, não prescrição nutricional.

---

## 13. Versão

**1.0.0** — release (versionCode 1), build `release` assinado com v1 + v2 + v3, com o guia
de execução por exercício, timer responsivo, metas automáticas de proteína/calorias e referência
do último treino, além das correções de teclado/estabilidade.

**1.0.1** — release (versionCode 2), build `release` assinado com v1 + v2 + v3. Download direto:

https://github.com/jonataprezende-commits/treino-academia/releases/download/v1.0.1/treino-forca-v1.0.1-release.apk

Página da release: https://github.com/jonataprezende-commits/treino-academia/releases/tag/v1.0.1

**1.0.2** — release (versionCode 3), correções de timer de descanso e cache do service worker. Download direto:

https://github.com/jonataprezende-commits/treino-academia/releases/download/v1.0.2/treino-forca-v1.0.2-release.apk

Página da release: https://github.com/jonataprezende-commits/treino-academia/releases/tag/v1.0.2

> A partir da v1.0.2 a assinatura é fixa (chave guardada nos secrets do CI): as próximas versões atualizam por cima sem precisar desinstalar.
