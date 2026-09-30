"""仅服务器管理员可执行的账号管理命令。绝不提供 HTTP 注册接口。"""
import argparse
import getpass
import sys

from backend.service import Settings, Store


def main():
    parser = argparse.ArgumentParser(description="仅在用户明确要求后开通或管理账号")
    parser.add_argument("action", choices=["create", "reset-password", "disable"])
    parser.add_argument("username")
    parser.add_argument("--name", default="Iris")
    parser.add_argument("--password-stdin", action="store_true", help="从标准输入安全传入密码，不放在命令参数中")
    args = parser.parse_args()
    store = Store(Settings.environment().database)
    password = None
    if args.action != "disable":
        password = sys.stdin.readline().rstrip("\r\n") if args.password_stdin else getpass.getpass("新密码（至少 16 字符）: ")
    try:
        if args.action == "create":
            store.create_account(args.username, args.name, password)
        else:
            store.administer(args.username, password=password, disable=args.action == "disable")
    except ValueError as error:
        parser.exit(1, str(error) + "\n")
    print(f"{args.action}: {args.username} 完成；未输出密码。")


if __name__ == "__main__":
    main()
