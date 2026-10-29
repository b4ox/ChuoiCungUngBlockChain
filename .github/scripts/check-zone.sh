#!/usr/bin/env bash
# =============================================================
# ZONE GUARD
# Kiểm tra mọi file trong Pull Request có nằm trong vùng được phép
# của người mở PR hay không. Dùng bởi .github/workflows/zone-guard.yml
#   $1 = username GitHub của người mở PR
#   $2 = file chứa danh sách đường dẫn đã thay đổi (mỗi dòng 1 file)
# =============================================================
set -euo pipefail

AUTHOR="$1"
CHANGED_FILES="$2"

# ----- 1. Điều phối viên được sửa mọi thứ -----
COORDINATOR="b4ox"
if [ "$AUTHOR" = "$COORDINATOR" ]; then
  echo "✅ $AUTHOR là điều phối viên: được sửa toàn bộ dự án."
  exit 0
fi

# ----- 2. Vùng được phép của từng thành viên -----
case "$AUTHOR" in
  nhungtrieu2005uh-bot)
    ZONE="Contract"
    ALLOWED='^(contracts/|shared/contract/|shared/CONTRACT_INTERFACE\.md$)'
    ;;
  vothinhungoc7980-coder)
    ZONE="Frontend"
    ALLOWED='^frontend/'
    ;;
  *)
    echo "::error::Tài khoản '$AUTHOR' chưa được phân vùng trong .github/scripts/check-zone.sh"
    exit 1
    ;;
esac

# ----- 3. File chung chỉ điều phối viên được sửa (kể cả nằm trong vùng con) -----
#   - mọi file ở thư mục gốc, thư mục .github/ và docs/, shared/README.md
#   - AGENTS.md / CLAUDE.md ở bất kỳ đâu
COMMON='^[^/]+$|^\.github/|^docs/|^shared/README\.md$|(^|/)(AGENTS|CLAUDE)\.md$'

COMMON_HITS=$(grep -E  "$COMMON"  "$CHANGED_FILES" || true)
OUTSIDE=$(grep -Ev "$ALLOWED" "$CHANGED_FILES" || true)

# ----- 4. Báo kết quả -----
FAILED=0
if [ -n "$COMMON_HITS" ]; then
  echo "::error::$AUTHOR ($ZONE) sửa file chung — chỉ $COORDINATOR được sửa:"
  echo "$COMMON_HITS"
  FAILED=1
fi
if [ -n "$OUTSIDE" ]; then
  echo "::error::$AUTHOR ($ZONE) sửa file ngoài vùng của mình:"
  echo "$OUTSIDE"
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  echo "👉 Hãy bỏ các file trên khỏi PR, hoặc nhờ $COORDINATOR thực hiện thay đổi đó."
  exit 1
fi
echo "✅ Mọi file đều nằm trong vùng $ZONE của $AUTHOR."
