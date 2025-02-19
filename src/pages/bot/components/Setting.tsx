import { Button, Form, Input, Switch, notification } from "antd";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import CONFIG from "../../../CONFIG";
import { getAtomicSwapEther } from "../../../common/ETH-HTLC";
import { pkhToCashAddr, cashAddrToPkh } from "../../../lib/common";
import { wrapOperation, showLoading, confirmOperation } from "../../../utils/operation";
import { getAccount } from "../../../utils/web3";
import { changeTimestampToDataFormat } from "../../../utils/date";
import { useStore } from "../../../common/store";

// const DatePicker = DatePicker_.generatePicker<Moment>(momentGenerateConfig);

export default function () {
    const { state, setStoreItem } = useStore()

    const [form] = Form.useForm<{
        addr: string,
        retiredAt: any,
        intro: string,
        botAddr: string,
        bchLockTime: string, // in blocks
        // sbchLockTime: string,// in seconds
        penaltyBPS: string,
        feeBPS: string,
        minSwapAmt: string,
        maxSwapAmt: string,
        statusChecker: string
        stakedValue: string,
    }>();

    useEffect(() => {
        const init = async () => {
            const atomicSwapEther = await getAtomicSwapEther()
            const marketMaker = await atomicSwapEther.marketMakers(await getAccount());
            if (marketMaker.addr !== ethers.constants.AddressZero) {
                const retiredAt = marketMaker.retiredAt.toNumber()
                form.setFieldsValue({
                    addr: marketMaker.addr,
                    retiredAt: retiredAt === 0 ? 0 : changeTimestampToDataFormat(retiredAt * 1000),
                    intro: ethers.utils.parseBytes32String(marketMaker.intro),
                    botAddr: pkhToCashAddr(marketMaker.bchPkh, CONFIG.MAINNET ? "mainnet" : "testnet"),
                    bchLockTime: marketMaker.bchLockTime,
                    penaltyBPS: marketMaker.penaltyBPS,
                    feeBPS: marketMaker.feeBPS,
                    minSwapAmt: ethers.utils.formatEther(marketMaker.minSwapAmt.toString()),
                    maxSwapAmt: ethers.utils.formatEther(marketMaker.maxSwapAmt.toString()),
                    statusChecker: marketMaker.statusChecker,
                    stakedValue: marketMaker.stakedValue.toString()
                })
                setHasCreated(true)
            }
        }
        init()
    }, [])

    const onFinish = wrapOperation(async () => {
        await confirmOperation({ content: `Registration will pledge 0.1bch and cannot initiate cross-chain transactions as a user.` })
        showLoading()
        const values = form.getFieldsValue()
        const atomicSwapEther = await getAtomicSwapEther()
        const MIN_STAKED_VALUE = await atomicSwapEther.MIN_STAKED_VALUE()
        const tx = await atomicSwapEther.registerMarketMaker(
            ethers.utils.formatBytes32String(values.intro), `0x${cashAddrToPkh(values.botAddr)}`,
            values.bchLockTime, values.penaltyBPS, values.feeBPS,
            ethers.utils.parseEther(values.minSwapAmt), ethers.utils.parseEther(values.maxSwapAmt),
            values.statusChecker, { value: MIN_STAKED_VALUE }
        )
        await tx.wait()
        form.setFieldsValue({ addr: await getAccount() })
        setHasCreated(true)
    }, "Register success")

    const updateInfo = wrapOperation(async () => {
        showLoading()
        // update
        const atomicSwapEther = await getAtomicSwapEther()
        const tx = await atomicSwapEther.updateMarketMaker(ethers.utils.formatBytes32String(form.getFieldsValue().intro));
        await tx.wait()
    }, "Update info success")

    const retireMarketMaker = wrapOperation(async () => {
        showLoading()
        // update
        const atomicSwapEther = await getAtomicSwapEther()
        const tx = await atomicSwapEther.retireMarketMaker();
        await tx.wait()
        const { retiredAt } = await atomicSwapEther.marketMakers(state.account)
        form.setFieldsValue({ retiredAt: changeTimestampToDataFormat(retiredAt.toNumber() * 1000) })
        setStoreItem({})
    }, "Retire success")

    const withdrawStakedBCH = wrapOperation(async () => {
        showLoading()
        // update
        const atomicSwapEther = await getAtomicSwapEther()
        const tx = await atomicSwapEther.withdrawStakedValue();
        await tx.wait()
        form.setFieldsValue({ stakedValue: "0" })
        setStoreItem({})
    }, "withdrawStakedBCH success")


    const [hasCreated, setHasCreated] = useState(false)

    return (<div style={{ width: 600, margin: "0 auto", marginTop: 20 }}><Form
        onFinish={onFinish}
        form={form}
        name="basic"
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        style={{ maxWidth: 600 }}
        autoComplete="off"
    >
        <Form.Item name="intro" label="Intro"
            rules={[{ required: true, message: 'intro is required' }]} >
            <Input suffix={hasCreated && <Button type="primary" onClick={updateInfo}>Update</Button>} />
        </Form.Item>
        {hasCreated && form.getFieldValue("retiredAt") && <Form.Item name="retiredAt" label={"Retired Time"}
            rules={[{ required: true, message: 'intro is required' }]} >
            <Input disabled />
        </Form.Item> || ''}
        <Form.Item name="botAddr" label="Bot BCH Address"
            rules={[{ required: true, message: "Bot's BCH Address is required" }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        <Form.Item name="bchLockTime" label="Bch Lock Time(Blocks)"
            rules={[{ required: true, message: 'bchLockTime is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        {/* <Form.Item name="sbchLockTime" label="Sbch Lock Time(seconds)"
            rules={[{ required: true, message: 'sbchLockTime is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item> */}
        <Form.Item name="penaltyBPS" label="Penalty(‱)"
            rules={[{ required: true, message: 'penaltyBPS is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        <Form.Item name="feeBPS" label="Fee(‱)"
            rules={[{ required: true, message: 'feeBPS is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        <Form.Item name="minSwapAmt" label="Min Swap Amount"
            rules={[{ required: true, message: 'minSwapAmt is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        <Form.Item name="maxSwapAmt" label="Max Swap Amount"
            rules={[{ required: true, message: 'maxSwapAmt is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        <Form.Item name="statusChecker" label="Status checker"
            rules={[{ required: true, message: 'statusChecker is required' }]} >
            <Input disabled={hasCreated} />
        </Form.Item>
        {!hasCreated && <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit">
                Create
            </Button>
        </Form.Item>}
        {hasCreated && !form.getFieldValue("retiredAt") && <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" onClick={retireMarketMaker}>
                Retire
            </Button>
        </Form.Item> || ''}
        {form.getFieldValue("stakedValue") != 0 && form.getFieldValue("retiredAt") && <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" onClick={withdrawStakedBCH}>
                Withdraw Staked BCH
            </Button>
        </Form.Item> || ''}
    </Form ></div>)
}