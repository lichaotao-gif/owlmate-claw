'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  FileText,
  Mic,
  MicOff,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CUSTOM_STRATEGIES_EVENT,
  CUSTOM_STRATEGIES_KEY,
  generateCustomStrategy,
  readCustomStrategies,
  type CustomStrategy,
} from '@/lib/investment-strategies';

type AgentInputMode = 'text' | 'voice' | 'document';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function inferStrategyName(description: string) {
  const firstLine = description
    .split(/[\n。！？]/u)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return '我的自定义策略';
  const compact = firstLine.replace(/^[我想要做一个套的]+/u, '').trim();
  return (compact || firstLine).slice(0, 18);
}

export function CustomStrategyDialog({
  open,
  onOpenChange,
  onCreated,
  marketId,
  context = 'experiment',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (strategy: CustomStrategy) => void;
  marketId?: string;
  context?: 'market' | 'experiment';
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [draft, setDraft] = useState<CustomStrategy | null>(null);
  const [error, setError] = useState('');
  const [inputMode, setInputMode] = useState<AgentInputMode>('text');
  const [documentName, setDocumentName] = useState('');
  const [isReadingDocument, setIsReadingDocument] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  function reset() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setName('');
    setDescription('');
    setDraft(null);
    setError('');
    setInputMode('text');
    setDocumentName('');
    setIsReadingDocument(false);
    setIsListening(false);
  }

  function selectInputMode(mode: AgentInputMode) {
    if (mode !== 'voice') recognitionRef.current?.stop();
    setInputMode(mode);
    setError('');
  }

  function generate() {
    if (description.trim().length < 12) {
      setError(
        '请再多描述一些，至少包含适用资产、选择规则或风险控制中的一项。',
      );
      return;
    }
    try {
      setDraft(
        generateCustomStrategy(
          name.trim() || inferStrategyName(description),
          description,
        ),
      );
      setError('');
    } catch {
      setError('策略草案生成失败，请稍后重试。');
    }
  }

  function save() {
    if (!draft) return;
    try {
      const strategy = marketId ? { ...draft, marketId } : draft;
      const previous = readCustomStrategies(
        localStorage.getItem(CUSTOM_STRATEGIES_KEY),
      );
      localStorage.setItem(
        CUSTOM_STRATEGIES_KEY,
        JSON.stringify([...previous, strategy]),
      );
      window.dispatchEvent(new CustomEvent(CUSTOM_STRATEGIES_EVENT));
      onCreated(strategy);
      onOpenChange(false);
      reset();
    } catch {
      setError('策略保存失败，请检查浏览器本地存储设置。');
    }
  }

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(
        '当前浏览器不支持语音转写，请使用 Chrome / Edge，或改用文字输入。',
      );
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        if (event.results[index].isFinal) {
          transcript += event.results[index][0].transcript;
        }
      }
      if (transcript) {
        setDescription((current) =>
          `${current}${current ? '\n' : ''}${transcript}`.slice(0, 1200),
        );
        setDraft(null);
      }
    };
    recognition.onerror = () => {
      setError('没有获取到语音，请检查麦克风权限后重试。');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setError('');
    setIsListening(true);
    recognition.start();
  }

  async function readStrategyDocument(file: File | undefined) {
    if (!file) return;
    setError('');
    setDraft(null);
    setIsReadingDocument(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let content = '';
      if (extension === 'docx') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({
          arrayBuffer: await file.arrayBuffer(),
        });
        content = result.value;
      } else if (extension === 'txt' || extension === 'md') {
        content = await file.text();
      } else {
        throw new Error('unsupported');
      }
      const cleaned = content.trim().slice(0, 1200);
      if (!cleaned) throw new Error('empty');
      setDocumentName(file.name);
      setDescription(cleaned);
      if (!name.trim()) {
        setName(file.name.replace(/\.(docx|txt|md)$/iu, '').slice(0, 40));
      }
    } catch {
      setDocumentName('');
      setError(
        '文档未能读取。请上传 .docx、.txt 或 .md 文件，并确认文件中有可读取的文字。',
      );
    } finally {
      setIsReadingDocument(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="owl-dialog strategy-create-dialog lab-strategy-create-dialog">
        <DialogTitle>OwlMate 策略 Agent</DialogTitle>
        <DialogDescription>
          说出、写下或导入你的想法，Agent 会整理成可复核的个人策略。
        </DialogDescription>
        {!draft ? (
          <div className="strategy-agent-create">
            <div className="strategy-agent-input-panel">
              <label>
                策略名称 <small>可选，Agent 可自动起名</small>
                <input
                  value={name}
                  maxLength={40}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：我的稳健轮动"
                />
              </label>
              <label>
                {inputMode === 'voice'
                  ? '口述转写'
                  : inputMode === 'document'
                    ? '文档内容'
                    : '我的策略想法'}
                <textarea
                  value={description}
                  maxLength={1200}
                  onChange={(event) => {
                    setDescription(event.target.value);
                    setDraft(null);
                  }}
                  placeholder="例如：从沪深300、纳指和黄金 ETF 中选最强的两个，每周调整；回撤超过 12% 时降低仓位……"
                />
                <small>{description.length} / 1200</small>
              </label>

              <div
                className="strategy-agent-modes"
                aria-label="选择策略输入方式"
              >
                <button
                  aria-pressed={inputMode === 'text'}
                  onClick={() => selectInputMode('text')}
                >
                  <FileText size={16} aria-hidden="true" />
                  <span>
                    <b>文字描述</b>
                    <small>直接编辑上方内容</small>
                  </span>
                </button>
                <button
                  aria-pressed={inputMode === 'voice'}
                  onClick={() => selectInputMode('voice')}
                >
                  <Mic size={16} aria-hidden="true" />
                  <span>
                    <b>语音口述</b>
                    <small>转写到上方输入框</small>
                  </span>
                </button>
                <button
                  aria-pressed={inputMode === 'document'}
                  onClick={() => selectInputMode('document')}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span>
                    <b>导入文档</b>
                    <small>提取到上方输入框</small>
                  </span>
                </button>
              </div>

              {inputMode === 'voice' && (
                <div className="strategy-agent-voice">
                  <button
                    className={isListening ? 'is-listening' : ''}
                    onClick={toggleVoiceInput}
                  >
                    {isListening ? (
                      <MicOff size={18} aria-hidden="true" />
                    ) : (
                      <Mic size={18} aria-hidden="true" />
                    )}
                    {isListening ? '停止录入' : '开始口述'}
                  </button>
                  <span>
                    {isListening
                      ? '正在聆听，你可以说适用资产、买入条件和止损规则……'
                      : '首次使用时浏览器会请求麦克风权限。'}
                  </span>
                </div>
              )}

              {inputMode === 'document' && (
                <label className="strategy-agent-upload">
                  <Upload size={20} aria-hidden="true" />
                  <span>
                    <b>
                      {isReadingDocument
                        ? '正在读取文档……'
                        : documentName || '选择策略文档'}
                    </b>
                    <small>支持 .docx、.txt 和 .md，单个文件</small>
                  </span>
                  <input
                    type="file"
                    accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                    disabled={isReadingDocument}
                    onChange={(event) =>
                      void readStrategyDocument(event.target.files?.[0])
                    }
                  />
                </label>
              )}
            </div>
            {error && (
              <p className="strategy-agent-error" role="alert">
                {error}
              </p>
            )}
            <div className="strategy-agent-privacy">
              <ShieldCheck size={15} />
              <span>
                文档只在浏览器内读取，不会上传到
                OwlMate；语音转写由浏览器提供，是否联网取决于浏览器。
                {context === 'experiment'
                  ? '保存后会自动选中该策略，并返回实验创建流程。'
                  : '策略只保存到本地策略库。'}
              </span>
            </div>
            <button
              className="strategy-create-submit"
              onClick={generate}
              disabled={isReadingDocument}
            >
              <Sparkles size={15} /> 让 Agent 生成策略草案
            </button>
          </div>
        ) : (
          <div className="strategy-agent-preview">
            <div className="strategy-agent-preview-heading">
              <span>
                <Sparkles size={14} /> AGENT DRAFT
              </span>
              <h3>{draft.name}</h3>
              <p>{draft.summary}</p>
              <div>
                {draft.tags.map((tag) => (
                  <small key={tag}>{tag}</small>
                ))}
              </div>
            </div>
            <div className="strategy-agent-preview-facts">
              <span>
                <small>适用资产</small>
                <b>{draft.assetScope}</b>
              </span>
              <span>
                <small>复核与调仓</small>
                <b>{draft.rebalance}</b>
              </span>
            </div>
            <div className="strategy-agent-preview-rules">
              <section>
                <h4>候选与入场规则</h4>
                {draft.entryRules.map((rule) => (
                  <p key={rule}>{rule}</p>
                ))}
              </section>
              <section>
                <h4>风险控制</h4>
                {draft.riskControls.map((rule) => (
                  <p key={rule}>{rule}</p>
                ))}
              </section>
            </div>
            {error && (
              <p className="strategy-agent-error" role="alert">
                {error}
              </p>
            )}
            <p className="strategy-agent-boundary">
              请检查关键条件。Agent
              只整理规则，不评判收益，也不会自动交易或发布到市场。
            </p>
            <div className="strategy-agent-preview-actions">
              <button
                className="market-card-secondary"
                onClick={() => setDraft(null)}
              >
                <RotateCcw size={14} /> 返回修改
              </button>
              <button className="strategy-create-submit" onClick={save}>
                <Check size={15} />
                {context === 'experiment' ? '保存并选中策略' : '保存到我的策略'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
