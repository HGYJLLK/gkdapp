import { Rule, RuleType } from '@midwayjs/validate';
import { SelectCommonDTO } from './common.dto';

export class CashRegisterDTO {
  // 必须为正数、最多两位小数，否则可通过负数提现虚增余额
  @Rule(RuleType.number().positive().precision(2).max(1000000).required())
  amount: number;

  @Rule(RuleType.string().max(64).required())
  bankNo: string;
}

export class CashListDTO extends SelectCommonDTO {
  @Rule(RuleType.string())
  cashBy?: 'rider' | 'user' | 'agent';

  @Rule(RuleType.string())
  cashNo?: string;

  @Rule(RuleType.number())
  status?: number;

  @Rule(RuleType.string())
  bankName?: string;

  @Rule(RuleType.string())
  cardNo?: string;

  @Rule(RuleType.string())
  realname?: string;
}

export class CashSuccessDTO {
  @Rule(RuleType.string().required())
  cashNo: string;
}

export class CashFailDTO extends CashSuccessDTO {
  @Rule(RuleType.string().required())
  reason: string;
}

export class CashAlipayExportExcelDTO {
  @Rule(RuleType.number().required())
  count: number;
}
