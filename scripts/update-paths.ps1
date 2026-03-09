// 批量更新分包路径 - PowerShell 脚本
// 使用方法: 在 PowerShell 中运行此脚本

$files = Get-ChildItem -Path "." -Recurse -Include *.js,*.wxml,*.json -Exclude node_modules

$replacements = @{
    '"/pages/product/product' = '"/packageProduct/pages/product/product'
    "'/pages/product/product" = "'/packageProduct/pages/product/product"
    '`/pages/product/product' = '`/packageProduct/pages/product/product'
    
    '"/pages/trace/source/source' = '"/packageProduct/pages/trace/source/source'
    "'/pages/trace/source/source" = "'/packageProduct/pages/trace/source/source"
    
    '"/pages/review/review' = '"/packageProduct/pages/review/review'
    "'/pages/review/review" = "'/packageProduct/pages/review/review"
    
    '"/pages/review/list/list' = '"/packageProduct/pages/review/list/list'
    "'/pages/review/list/list" = "'/packageProduct/pages/review/list/list"
    
    '"/pages/order/confirm/confirm' = '"/packageOrder/pages/order/confirm/confirm'
    "'/pages/order/confirm/confirm" = "'/packageOrder/pages/order/confirm/confirm"
    
    '"/pages/order/list/list' = '"/packageOrder/pages/order/list/list'
    "'/pages/order/list/list" = "'/packageOrder/pages/order/list/list"
    
    '"/pages/order/detail/detail' = '"/packageOrder/pages/order/detail/detail'
    "'/pages/order/detail/detail" = "'/packageOrder/pages/order/detail/detail"
    
    '"/pages/payment/payment' = '"/packageOrder/pages/payment/payment'
    "'/pages/payment/payment" = "'/packageOrder/pages/payment/payment"
    
    '"/pages/group/list/list' = '"/packageOther/pages/group/list/list'
    "'/pages/group/list/list" = "'/packageOther/pages/group/list/list"
    
    '"/pages/group/detail/detail' = '"/packageOther/pages/group/detail/detail'
    "'/pages/group/detail/detail" = "'/packageOther/pages/group/detail/detail"
    
    '"/pages/coupon/center/center' = '"/packageOther/pages/coupon/center/center'
    "'/pages/coupon/center/center" = "'/packageOther/pages/coupon/center/center"
    
    '"/pages/coupon/select/select' = '"/packageOther/pages/coupon/select/select'
    "'/pages/coupon/select/select" = "'/packageOther/pages/coupon/select/select"
    
    '"/pages/customer-service/customer-service' = '"/packageOther/pages/customer-service/customer-service'
    "'/pages/customer-service/customer-service" = "'/packageOther/pages/customer-service/customer-service"
    
    '"/pages/user/settings/settings' = '"/packageUser/pages/user/settings/settings'
    "'/pages/user/settings/settings" = "'/packageUser/pages/user/settings/settings"
    
    '"/pages/user/address/list/list' = '"/packageUser/pages/user/address/list/list'
    "'/pages/user/address/list/list" = "'/packageUser/pages/user/address/list/list"
    
    '"/pages/user/address/edit/edit' = '"/packageUser/pages/user/address/edit/edit'
    "'/pages/user/address/edit/edit" = "'/packageUser/pages/user/address/edit/edit"
    
    '"/pages/user/coupon/coupon' = '"/packageUser/pages/user/coupon/coupon'
    "'/pages/user/coupon/coupon" = "'/packageUser/pages/user/coupon/coupon"
    
    '"/pages/user/favorite/favorite' = '"/packageUser/pages/user/favorite/favorite'
    "'/pages/user/favorite/favorite" = "'/packageUser/pages/user/favorite/favorite"
}

$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $new
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "✓ 已更新: $($file.FullName)"
        $count++
    }
}

Write-Host "`n完成！共更新 $count 个文件"
