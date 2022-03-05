import { Box, Button, Heading, HStack, Img, Stack, Text, VStack } from '@chakra-ui/react'
import { useEthers } from '@usedapp/core'
import axios from 'axios'
import { ethers } from 'ethers'
import type { GetServerSideProps, InferGetServerSidePropsType, NextPage } from 'next'
import { useRouter } from 'next/router'
import { ABI, DEPLOYED_ADDRESS } from '../config/escrow'
import { getProduct } from "./api/astradb";
import Link from 'next/link'

const ProductDetails: NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> = ({
    productDetails
}) => {

    const { active, account, activateBrowserWallet, library } = useEthers()
    const router = useRouter()
    const { product_id } = router.query
    const signer = library?.getSigner()
    const contract = new ethers.Contract(DEPLOYED_ADDRESS, ABI, signer)
    const headers = {
        'X-Cassandra-Token': `${process.env.ASTRA_DB_APPLICATION_TOKEN}`,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    } 

    const processNft = async (
        productId: string,
        operation: string,
        tokenId: string=""
        ) => {
        if(operation==="listNft")
        {
            const price = '0.1'
            const price_in_wei = ethers.utils.parseEther(price)
            const dummyTx = await contract.callStatic.listNft(price_in_wei, productId, {
                value: price_in_wei.div('4')
            })
            const expectedTokenId = ethers.BigNumber.from(dummyTx).toString()
            const listNftTx = await contract.listNft(price_in_wei, productId, {
                value: price_in_wei.div('4')
            })
            if(listNftTx){
                const receipt = await listNftTx.wait()
                const astra_url = `${process.env.ASTRA_DB_URL}/catalog/${productId}`
                const res = await axios.patch(astra_url, {
                    "product_status": "LISTED",
                    "tokenid": expectedTokenId
                    },{
                      headers: headers
                });
            }
        }
        if(operation==="bidNft")
        {
            const price = '0.125'
            const price_in_wei = ethers.utils.parseEther(price)
            const bidNftTx = await contract.bidNft(parseInt(tokenId), {
            value: price_in_wei,
            gasLimit: ethers.BigNumber.from('100000')
            })
            if(bidNftTx){
                const receipt = await bidNftTx.wait()
                if(receipt){
                  const astra_url =`${process.env.ASTRA_DB_URL}/catalog/${productId}`
                  const res = await axios.patch(astra_url, {
                      "product_status": "BOUGHT",
                      "buyer_address": account
                      }, {
                        headers: headers
                    });
                }
            }
        }
        if(operation==="shipNft")
        {
            const shipNftTx = await contract.shipNft(parseInt(tokenId), {
                gasLimit: ethers.BigNumber.from('120000')
            })
            if(shipNftTx){
                console.log(shipNftTx)
                const receipt = await shipNftTx.wait()
                if(receipt){
                  const astra_url = `${process.env.ASTRA_DB_URL}/catalog/${productId}`
                  const res = await axios.patch(astra_url, {
                    "product_status": "SHIPPED"
                  }, {
                    headers: headers
                    });
                }
            }
        }
        if(operation==="receiveNft")
        {
            const receiveNftTx = await contract.receiveNft(parseInt(tokenId), {
                gasLimit: ethers.BigNumber.from('100000')
            })
            if(receiveNftTx){
                const astra_url = `${process.env.ASTRA_DB_URL}/catalog/${productId}`
                const res = await axios.patch(astra_url, {
                    "product_status": "RECEIVED"
                    }, {
                    headers: headers
                });
            }
        }
        
        
    }

    return(
        <Box>
            <HStack fontFamily={'Work Sans'} px={16} py={8} align={'center'} justify={'space-between'}>
            <Link href="/">
            <Button
                    rounded={'full'}
                    bgColor={'blackAlpha.900'}
                    color={'whiteAlpha.900'}
                    _hover={{ bgColor: 'gray.700', fontWeight: 'semibold' }}
                    fontWeight={'normal'}
                >DS Commerce
                </Button>
				</Link>
                {
                    account &&
                    <Text>
                        Connected as:
                        <strong>
                        {` ${account.slice(0,9)}...${account.slice(-9)}`}
                        </strong>
                    </Text>
                }
                <Button
                    rounded={'full'}
                    bgColor={'blackAlpha.900'}
                    color={'whiteAlpha.900'}
                    _hover={{ bgColor: 'gray.700', fontWeight: 'semibold' }}
                    fontWeight={'normal'}
                    onClick={() => {!active ? activateBrowserWallet() : {} }}
                >
                    {
                        account ? '' : 'Connect Metamask'
                    }
                </Button>
            </HStack>
            <VStack>
                <Stack>
                    <Text align="center" fontFamily={'Work Sans'}>#{product_id}</Text>
                    <Box align="center">
                        <Img src={`${process.env.AWS_S3!}${product_id}.jpeg`} boxSize='360px'/>
                    </Box>
                    <Text>{productDetails.name}</Text>
                    <Text>{productDetails.description}</Text>
                    <Text><strong>Listed Price: </strong>${productDetails.price}</Text>
                    <Text><strong>Sold by: </strong>{productDetails.seller_address}</Text>
                    <Text><strong>Bid by: </strong>{productDetails.buyer_address}</Text>
                    <Text><strong>STATUS: </strong>{productDetails.product_status}</Text>
                    <Box  align="center">
                    {(() => {
                        switch(productDetails.product_status){
                            case 'DRAFT':
                                return(
                                    <Button onClick={() => processNft(
                                        productDetails.product_id,
                                        "listNft")}>
                                        List as NFT
                                    </Button>
                                )

                            case 'LISTED':
                                return (
                                    <Button onClick={
                                        () => processNft(
                                            productDetails.product_id,
                                            "bidNft",
                                            productDetails.tokenid,)
                                    }>
                                        Bid on NFT
                                    </Button>
                                )

                            case 'BOUGHT':
                                return (
                                    <Button onClick={() => processNft(
                                        productDetails.product_id,
                                        "shipNft",
                                        productDetails.tokenid)}>
                                        Ship NFT
                                    </Button>
                                )

                            case 'SHIPPED':
                                return (
                                    <Button onClick={() => processNft(
                                        productDetails.product_id,
                                        "receiveNft",
                                        productDetails.tokenid )}>
                                        Receive NFT
                                    </Button>
                                )

                            case 'RECEIVED':
                                return (
                                    <Heading fontFamily={'Rubik'}>Deal closed.</Heading>
                                )
                        }
                    })()}
                    </Box>
                </Stack>
            </VStack>
        </Box>
    )
}

export default ProductDetails

export const getServerSideProps: GetServerSideProps = async (context) => {
    const productId = context.params!.product_id
    const product = await getProduct(productId);
    console.log(product![0]);
    return {
        props: {
            productDetails: product![0]
        }
    };
}