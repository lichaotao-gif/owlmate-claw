'use client';

import { useState } from 'react';
import { activateDemoSession, saveProfile } from '@/lib/profile-store';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  MessageSquareText,
  UserPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

export type InvestorProfile = {
  username: string;
  phoneMasked: string;
  ageRange: string;
  experience: string;
  goal: string;
  horizon: string;
  investableAssets: string;
  monthlyContribution: string;
  maxDrawdown: string;
  liquidity: string;
  recommendedAllocation: number;
  riskLabel: string;
};

type OnboardingStage =
  | 'register'
  | 'registration-success'
  | 'profile-background'
  | 'profile-risk';

const initial = {
  username: '',
  phone: '13800138000',
  code: '123456',
  ageRange: '31–45 岁',
  experience: '1–3 年',
  goal: '稳健增值',
  horizon: '1–3 年',
  investableAssets: '10–50 万元',
  monthlyContribution: '5,000–20,000 元',
  maxDrawdown: '10%',
  liquidity: '中等',
};

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function OnboardingDemo({
  onRegistered,
  onComplete,
  editProfile,
  profileOnly = false,
}: {
  editProfile?: InvestorProfile | null;
  profileOnly?: boolean;
  onRegistered?: (account: { username: string; phoneMasked: string }) => void;
  onComplete: (profile: InvestorProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<OnboardingStage>('register');
  const [sent, setSent] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initial);
  const phoneMasked = `${form.phone.slice(0, 3)}****${form.phone.slice(-4)}`;

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  function register() {
    setError('');
    if (form.username.trim().length < 2) {
      setError('请输入至少 2 个字符的用户名。');
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      setError('请输入有效的 11 位手机号码。');
      return;
    }
    if (!sent) {
      setError('请先获取演示验证码。');
      return;
    }
    if (form.code !== '123456') {
      setError('演示验证码为 123456。');
      return;
    }

    const account = { username: form.username.trim(), phoneMasked };
    activateDemoSession(account);
    onRegistered?.(account);
    setStage('registration-success');
  }

  function finish() {
    const drawdownAllocation: Record<string, number> = {
      '5%': 25,
      '10%': 45,
      '20%': 65,
      '30% 以上': 80,
    };
    let allocation = drawdownAllocation[form.maxDrawdown] ?? 45;
    if (form.horizon === '5 年以上') allocation += 10;
    if (form.horizon === '1 年以内') allocation -= 10;
    if (form.liquidity === '高，需要随时取用') allocation -= 10;
    allocation = Math.max(15, Math.min(85, Math.round(allocation / 5) * 5));
    const riskLabel =
      allocation <= 35 ? '谨慎型' : allocation <= 60 ? '稳健型' : '成长型';

    const next: InvestorProfile = {
      username: form.username.trim(),
      phoneMasked: profileOnly ? (editProfile?.phoneMasked ?? '') : phoneMasked,
      ageRange: form.ageRange,
      experience: form.experience,
      goal: form.goal,
      horizon: form.horizon,
      investableAssets: form.investableAssets,
      monthlyContribution: form.monthlyContribution,
      maxDrawdown: form.maxDrawdown,
      liquidity: form.liquidity,
      recommendedAllocation: allocation,
      riskLabel,
    };
    try {
      saveProfile(next);
    } catch {
      setError('保存失败，浏览器存储不可用。请重试，填写内容已保留。');
      return;
    }
    onComplete(next);
    setOpen(false);
    setStage('register');
    setError('');
    setSent(true);
    setForm(initial);
  }

  const isProfile = stage === 'profile-background' || stage === 'profile-risk';
  const profileStep = stage === 'profile-risk' ? 2 : 1;

  return (
    <>
      <button
        className="new-user-demo"
        onClick={() => {
          if (profileOnly) {
            setForm({
              ...initial,
              ...editProfile,
              username: editProfile?.username ?? '演示账户',
            });
            setStage('profile-background');
          }
          setError('');
          setOpen(true);
        }}
      >
        <UserPlus size={15} />
        {profileOnly
          ? editProfile
            ? '修改投资画像'
            : '填写投资画像'
          : '新用户演示'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="owl-dialog onboarding-dialog">
          {isProfile && error && <p className="down">{error}</p>}
          {stage === 'register' && (
            <>
              <DialogTitle>注册 OwlMate 演示账户</DialogTitle>
              <DialogDescription>
                先完成账号注册，注册成功后再选择是否建立投资画像。
              </DialogDescription>
              <div className="dialog-body onboarding-step">
                <div className="onboarding-intro">
                  <MessageSquareText size={18} />
                  <div>
                    <b>手机号验证码注册</b>
                    <p>正式上线时接入短信服务；当前使用固定演示验证码。</p>
                  </div>
                </div>
                <label>
                  用户名
                  <input
                    value={form.username}
                    onChange={(event) => update('username', event.target.value)}
                    placeholder="例如：李先生"
                    autoComplete="name"
                  />
                </label>
                <label>
                  手机号码
                  <div className="phone-code-row">
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(event) =>
                        update(
                          'phone',
                          event.target.value.replace(/\D/g, '').slice(0, 11),
                        )
                      }
                      placeholder="11 位手机号码"
                      autoComplete="tel"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!/^1[3-9]\d{9}$/.test(form.phone)) {
                          setError('请先输入有效的手机号码。');
                          return;
                        }
                        setSent(true);
                        setError('');
                      }}
                    >
                      {sent ? '已发送' : '获取验证码'}
                    </button>
                  </div>
                </label>
                <label>
                  验证码
                  <input
                    inputMode="numeric"
                    value={form.code}
                    onChange={(event) =>
                      update(
                        'code',
                        event.target.value.replace(/\D/g, '').slice(0, 6),
                      )
                    }
                    placeholder={sent ? '请输入 123456' : '请先获取验证码'}
                    autoComplete="one-time-code"
                  />
                </label>
                {sent && (
                  <div className="demo-code">
                    演示验证码：<b>123456</b>
                  </div>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="onboarding-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={register}
                >
                  完成注册
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {stage === 'registration-success' && (
            <>
              <DialogTitle className="sr-only">注册成功</DialogTitle>
              <DialogDescription className="sr-only">
                OwlMate 演示账户已经创建，可以继续建立投资画像。
              </DialogDescription>
              <div
                className="onboarding-registration-success"
                aria-live="polite"
              >
                <span className="registration-success-icon">
                  <CheckCircle2 size={30} />
                </span>
                <span className="registration-success-label">账号注册完成</span>
                <h3>注册成功</h3>
                <p>
                  欢迎你，{form.username.trim()}
                  。账户已经创建，接下来可以单独建立投资画像。
                </p>
                <div className="registration-success-account">
                  <span>当前账户</span>
                  <b>{form.username.trim()}</b>
                  <small>{phoneMasked}</small>
                </div>
                <div className="registration-next-step">
                  <b>下一步：建立投资画像</b>
                  <p>填写投资经验、目标和风险偏好，生成更适合你的演示仓位。</p>
                </div>
              </div>
              <div className="onboarding-actions onboarding-success-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  稍后再说
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => setStage('profile-background')}
                >
                  开始建立画像
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

          {isProfile && (
            <>
              <DialogTitle>建立你的投资画像</DialogTitle>
              <DialogDescription>
                画像与账号注册相互独立，保存在当前浏览器，用于首页建议与持仓体检。
              </DialogDescription>
              <div
                className="onboarding-progress profile-onboarding-progress"
                aria-label={`投资画像第 ${profileStep} 步，共 2 步`}
              >
                {['投资背景', '资金与风险'].map((label, index) => (
                  <div
                    className={profileStep >= index + 1 ? 'active' : ''}
                    key={label}
                  >
                    <b>
                      {profileStep > index + 1 ? (
                        <Check size={12} />
                      ) : (
                        index + 1
                      )}
                    </b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {stage === 'profile-background' && (
                <div className="dialog-body onboarding-step">
                  <div className="onboarding-grid">
                    <SelectField
                      label="年龄范围"
                      value={form.ageRange}
                      onChange={(value) => update('ageRange', value)}
                      options={[
                        '18–30 岁',
                        '31–45 岁',
                        '46–60 岁',
                        '60 岁以上',
                      ]}
                    />
                    <SelectField
                      label="投资经验"
                      value={form.experience}
                      onChange={(value) => update('experience', value)}
                      options={['没有经验', '1–3 年', '3–10 年', '10 年以上']}
                    />
                    <SelectField
                      label="主要投资目标"
                      value={form.goal}
                      onChange={(value) => update('goal', value)}
                      options={[
                        '稳健增值',
                        '长期增长',
                        '养老准备',
                        '子女教育',
                        '短期资金管理',
                      ]}
                    />
                    <SelectField
                      label="预计投资期限"
                      value={form.horizon}
                      onChange={(value) => update('horizon', value)}
                      options={['1 年以内', '1–3 年', '3–5 年', '5 年以上']}
                    />
                  </div>
                  <div className="info-box">
                    这些信息用于判断策略期限和解释深度。采用年龄范围而非出生日期，减少不必要的个人信息收集。
                  </div>
                </div>
              )}

              {stage === 'profile-risk' && (
                <div className="dialog-body onboarding-step">
                  <div className="onboarding-grid">
                    <SelectField
                      label="可投资资产范围"
                      value={form.investableAssets}
                      onChange={(value) => update('investableAssets', value)}
                      options={[
                        '10 万元以内',
                        '10–50 万元',
                        '50–200 万元',
                        '200 万元以上',
                      ]}
                    />
                    <SelectField
                      label="每月可追加资金"
                      value={form.monthlyContribution}
                      onChange={(value) => update('monthlyContribution', value)}
                      options={[
                        '暂不追加',
                        '5,000 元以内',
                        '5,000–20,000 元',
                        '20,000 元以上',
                      ]}
                    />
                    <SelectField
                      label="可接受最大回撤"
                      value={form.maxDrawdown}
                      onChange={(value) => update('maxDrawdown', value)}
                      options={['5%', '10%', '20%', '30% 以上']}
                    />
                    <SelectField
                      label="资金流动性需求"
                      value={form.liquidity}
                      onChange={(value) => update('liquidity', value)}
                      options={['高，需要随时取用', '中等', '低，可长期持有']}
                    />
                  </div>
                  <div className="info-box">
                    OwlMate
                    将根据最大回撤、投资期限和流动性生成演示仓位。可投资资产使用区间，不要求录入收入、身份证或银行卡。
                  </div>
                </div>
              )}

              <div className="onboarding-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    if (profileOnly && stage === 'profile-background') {
                      setOpen(false);
                      return;
                    }
                    setStage(
                      stage === 'profile-risk'
                        ? 'profile-background'
                        : 'registration-success',
                    );
                  }}
                >
                  <ArrowLeft size={15} />
                  {profileOnly && stage === 'profile-background'
                    ? '取消'
                    : '上一步'}
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() =>
                    stage === 'profile-risk'
                      ? finish()
                      : setStage('profile-risk')
                  }
                >
                  {stage === 'profile-risk' ? '保存投资画像' : '继续'}
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
