"use client";

import { AxButton, AxTableLayout } from "@/framework/components/antd";
import {
  CsInputDateItem,
  CsInputTextItem,
  CsRadioBoxItem,
  CsSelectBoxItem,
  CsTextAreaItem,
  CsView,
  CustomValidationRules,
  selectOptionStrings,
  stringCustomValidationRule,
  stringRule,
  useCsInputDateItem,
  useCsInputTextItem,
  useCsRadioBoxItem,
  useCsSelectBoxItem,
  useCsTextAreaItem,
  useCsView,
  useInit,
} from "@/framework/logics";
import { Card, Space, message } from "antd";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

// Viewタイプ定義
type RegisterUserView = CsView & {
  lastName: CsInputTextItem;
  firstName: CsInputTextItem;
  gender: CsRadioBoxItem;
  birthDate: CsInputDateItem;
  department: CsSelectBoxItem;
  position: CsInputTextItem;
  remarks: CsTextAreaItem;
};

// カスタムバリデーションルールの定義
const customValidationRules: CustomValidationRules = {
  noFutureDate: stringCustomValidationRule(
    (newValue) => {
      if (!newValue) {
        return true;
      }
      const selectedDate = dayjs(newValue);
      const today = dayjs();
      return (
        selectedDate.isBefore(today, "day") || selectedDate.isSame(today, "day")
      );
    },
    (label) => `${label}に未来の日付は指定できません`,
  ),
};

// Viewを作成するフック
const useRegisterUserView = (): RegisterUserView => {
  return useCsView(
    {
      lastName: useCsInputTextItem("姓", useInit(""), stringRule(true, 0, 50)),
      firstName: useCsInputTextItem("名", useInit(""), stringRule(true, 0, 50)),
      gender: useCsRadioBoxItem(
        "性別",
        useInit(""),
        stringRule(true),
        selectOptionStrings(["男性", "女性", "その他"]),
      ),
      birthDate: useCsInputDateItem(
        "生年月日",
        useInit(""),
        stringRule(true, 0, 0, "noFutureDate"),
      ),
      department: useCsSelectBoxItem(
        "所属部署",
        useInit(""),
        stringRule(true),
        selectOptionStrings(["営業部", "開発部", "人事部", "総務部", "経理部"]),
      ),
      position: useCsInputTextItem(
        "役職",
        useInit(""),
        stringRule(false, 0, 30),
      ),
      remarks: useCsTextAreaItem(
        "備考",
        useInit(""),
        stringRule(false, 0, 500),
      ),
    },
    {
      customValidationRules: customValidationRules,
      validationTrigger: "onSubmit",
    },
  );
};

// メインコンポーネント
const RegisterUser = () => {
  const router = useRouter();
  const view: RegisterUserView = useRegisterUserView();

  const handleRegister = () => {
    // 登録処理（実際にはAPIコール等を行う）
    const userData = {
      lastName: view.lastName.value,
      firstName: view.firstName.value,
      gender: view.gender.value,
      birthDate: view.birthDate.value,
      department: view.department.value,
      position: view.position.value,
      remarks: view.remarks.value,
    };

    console.log("登録データ:", userData);
    message.success("ユーザーを登録しました");

    // TODO: 実際にはユーザー一覧画面に遷移
    router.push("/");
  };

  const handleCancel = () => {
    router.push("/");
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="ユーザー登録"
        style={{ maxWidth: "800px", margin: "0 auto" }}
      >
        <AxTableLayout
          view={view}
          colSize={1}
          labelPlacement="left"
          labelWidth={20}
        />
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Space size="middle">
            <AxButton onClick={handleCancel}>キャンセル</AxButton>
            <AxButton
              type="primary"
              validationViews={[view]}
              onClick={handleRegister}
              validateErrorMessage="入力内容にエラーがあります。確認してください。"
            >
              登録
            </AxButton>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default RegisterUser;
